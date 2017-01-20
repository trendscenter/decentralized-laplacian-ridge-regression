'use strict';

const distributions = require('distributions');
const get = require('lodash/get');
const fs = require('fs');
const FreeSurfer = require('freesurfer-parser');
const pify = require('pify');
const n = require('numeric');
const regression = require('./regression');
const DECLARATION_INPUTS_KEY = require('./constants').DECLARATION_INPUTS_KEY;

/**
 * Add bias.
 *
 * @param {?} A
 * @returns {Array}
 */
function addBias(arr) {
  if (!Array.isArray(arr) || !arr.length) {
    throw new Error(`Expected ${arr} to be an array with length`);
  } else if (!arr.every(Array.isArray)) {
    throw new Error(`Expected every item of ${arr} to be an array`);
  }

  return arr.map(row => row.concat(1));
}

/**
 * Get normalized co-variate values.
 *
 * @todo This ignores non-numeric and non-boolean tag values. Determine
 * an effective way to map strings and non-primitives to numbers.
 *
 * @param {Object} tags Hash of tag names to tag values
 * @returns {Array}
 */
function getNormalizedTags(tags) {
  return Object.keys(tags).sort().reduce((memo, tag) => {
    const value = tags[tag];

    if (typeof value === 'boolean') {
      return memo.concat(value === true ? 1 : -1);
    } else if (typeof value === 'number') {
      return memo.concat(value);
    }

    return memo;
  }, []);
}

module.exports = {
  /**
   * @private
   */
  addBias,

  /**
   * @private
   */
  getNormalizedTags,

  /**
   * Pre-process.
   *
   * @param {Object} opts
   * @param {string} opts.consortiumId
   * @param {(Object|undefined)} opts.previousData
   * @param {RemoteComputationResult} opts.remoteResult
   * @param {Project} opts.userData
   * @param {string} opts.username
   * @returns {Object}
   */
  preprocess(opts) {
    let features = get(opts, 'remoteResult.pluginState.inputs[0][0]');

    /**
     * Retrieve plugin from user data.
     *
     * @todo This is a hack for simulator. Add a simulator hook to modify plugin
     * state.
     */
    if (!features && DECLARATION_INPUTS_KEY in opts.userData) {
      features = opts.userData[DECLARATION_INPUTS_KEY][0][0];
    }

    if (!features || !Array.isArray(features) || !features.length) {
      throw new Error('Expected inputs containing features');
    } else if (
      features.some(f => FreeSurfer.validFields.indexOf(f) < 0)
    ) {
      throw new Error(`Unknown FreeSurfer region in inputs: ${features.toString()}`);
    }

    const readFileAsync = pify(fs.readFile);
    const userData = opts.userData;

    /**
     * `X` contains n x 1-dimensional matrices where values are normalized
     * co-variates:
     *
     *   [
     *     [<diagnosis>, <gender>, <age> ...]
     *     [<diagnosis>, <gender>, <age> ...]
     *     [<diagnosis>, <gender>, <age> ...]
     *   ]
     */
    const X = userData.files.map(file => getNormalizedTags(file.tags));

    /**
     * Ensure that `biasedX` contains arrays of at least length 2. If a single
     * co-variate is selected, `X` will look like:
     *
     *   [
     *     [<diagnosis>],
     *     [<diagnosis>],
     *     [<diagnosis>],
     *   ]
     *
     * `addBias` will add bias to the arrays:
     *
     *   [
     *     [<diagnosis>, 1],
     *     [<diagnosis>, 1],
     *     [<diagnosis>, 1],
     *   ]
     *
     * If `X` contains multiple co-variates don't add bias.
     */
    const biasedX = addBias(X);
    const result = {
      biasedX,
      eta: userData.eta || 1e-1,
      lambda: userData.lambda || 0.0,
      numFeatures: biasedX[0].length,
    };

    return Promise.all(
      userData.files.map(file => readFileAsync(file.filename))
    )
      .then((freeSurfers) => {
        /**
         * `y` contains region of interest values:
         *
         *   [1000, 1001, 5400, 4000]
         */
        result.y = freeSurfers.map((data) => {
          /**
           * Pick FreeSurfer feature.
           *
           * @todo: This uses only one feature. Change to use multiple!
           */
          const freeSurfer = new FreeSurfer({
            string: data.toString(),
          });

          // filter based on first passed in ROI
          return freeSurfer[features[0]];
        });

        return result;
      });
  },

  // @TODO assert proper array dims
  run(opts) {
    const result = opts.previousData;
    const remoteData = get(opts, 'remoteResult.data');

    // clean unused initial data from preprocessing step.
    delete result.lambda;
    delete result.kickoff;
    delete result.eta;
    delete result.numFeatures;

    // begin processing
    result.lGrad = regression.gradient(
      remoteData.currW,
      result.biasedX,
      result.y,
      remoteData.lambda
    );
    result.lObj = regression.objective(
      remoteData.currW,
      result.biasedX,
      result.y,
      remoteData.lambda
    );
    /* eslint-disable no-console */
    console.log(`gradient: ${result.lGrad}, objective: ${result.lObj}`);
    /* eslint-enable no-console */
    return result;
  },

  /**
   * Get statistics output.
   *
   * @param {Object} opts
   * @param {Object} opts.remoteResult
   * @param {Object} opts.previousData
   * @returns {Object}
   */
  getStatistics({
    previousData,
    remoteResult,
  }) {
    if (
      remoteResult.data.endOfIteration === true &&
      remoteResult.data.statisticStep === 0
    ) {
      // step 0 calculate local statistics and localYMean
      const biasedX = previousData.biasedX;
      const y = previousData.y;
      const localCount = y.length;
      const betaVector = regression.oneShot(biasedX, y);
      const rSquared = regression.rSquared(biasedX, y, betaVector);
      const tValue = regression.tValue(biasedX, y, betaVector);
      /* eslint-disable new-cap */
      const tdist = distributions.Studentt(localCount - 1);
      /* eslint-enable new-cap */
      const tcdf = tValue.map(r => tdist.cdf(r));
      const pValue = n.mul(2, n.sub(1, tcdf));
      const localMeanY = n.sum(y) / localCount;

      return {
        betaVector,
        localCount,
        localMeanY,
        rSquared,
        tValue,
        pValue,
        biasedX,
        y,
        endOfIteration: true,
        statisticStep: 0,
      };
    } else if (
      remoteResult.data.endOfIteration === true &&
      remoteResult.data.statisticStep === 1
    ) {
      // step 1 receive the globalMeanY and currW, then calculate sseLocal,
      // sstLocal and varXLocal

      const globalMeanY = remoteResult.data.globalMeanY;
      const currW = remoteResult.data.currW;
      const biasedX = previousData.biasedX;
      const y = previousData.y;
      const rSquared = previousData.rSquared;
      const tValue = previousData.tValue;
      const pValue = previousData.pValue;
      const localCount = y.length;

      // calculate the local r squred and t value for averageBetaVector)
      const rSquaredLocal = regression.rSquared(biasedX, y, currW);
      const tValueLocal = regression.tValue(biasedX, y, currW);
      /* eslint-disable new-cap */
      const tdist = distributions.Studentt(localCount - 1);
      /* eslint-enable new-cap */
      const tcdf = tValueLocal.map(r => tdist.cdf(r));
      const pValueLocal = n.mul(2, n.sub(1, tcdf));

      // calculate sseLocal and sstLocal
      const sseLocal = n.sum(n.pow(n.sub(y, n.dot(biasedX, currW)), 2));
      const sstLocal = n.sum(n.pow(n.sub(y, n.rep(n.dim(y), globalMeanY)), 2));

      // calculate varXLocal
      const varXLocalMatrix = n.dot(n.transpose(biasedX), biasedX);
      const varXLocal = [];
      for (let i = 0; i < currW.length; i += 1) {
        varXLocal.push(varXLocalMatrix[i][i]);
      }

      /* eslint-disable no-console */
      console.log('local r squared for currW', rSquaredLocal);
      console.log('local t Values for currW', tValueLocal);
      console.log('local p Values for currW', pValueLocal);
      /* eslint-enable no-console */

      return {
        sseLocal,
        sstLocal,
        varXLocal,
        currW,
        localCount,
        rSquared,
        tValue,
        pValue,
        rSquaredLocal,
        tValueLocal,
        pValueLocal,
        endOfIteration: true,
        statisticStep: 1,
      };
    }

    return this.run({
      previousData,
      remoteResult,
    });
  },
};
