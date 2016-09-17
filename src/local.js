'use strict';

const regression = require('./regression');
const numeric = require('numeric');
const get = require('lodash/get');
const fs = require('fs');
const FreeSurfer = require('freesurfer-parser');
const pify = require('pify');

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
   * @param {RemoteComputationResult} opts.remoteResult
   * @param {Project} opts.userData
   * @returns {Object}
   */
  preprocess(opts) {
    const features = get(opts, 'remoteResult.pluginState.inputs[0][0]');

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
    const biasedX = X[0].length === 1 ? addBias(X) : X;
    const result = {
      biasedX,
      eta: userData.eta || 1e-1,
      lambda: userData.lambda || 0.0,
      numFeatures: numeric.dim(biasedX)[1],
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
};
