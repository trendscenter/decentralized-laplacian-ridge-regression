'use strict';

const n = require('numeric');
const regression = require('./regression');
const numeric = require('numeric');
const get = require('lodash/get');
const fs = require('fs');
const FreeSurfer = require('freesurfer-parser');

module.exports = {
  addBias(A) {
    const tPose = n.transpose(A);
    const withBias = tPose.concat([n.rep([n.dim(A)[0]], 1)]);
    return n.transpose(withBias);
  },

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

    /**
     * @todo: This uses only one feature. Change to use multiple!
     *
     * @param {FreeSurfer} freeSurfer
     * @returns {Number}
     */
    function pickFeatures(freeSurfer) {
      return freeSurfer[features[0]];

      // return Object.keys(freeSurfer).reduce((memo, key) => {
      //   return features.indexOf(key) > -1 ?
      //     memo.concat(freeSurfer[key]) :
      //     memo;
      // }, []);
    }

    const userData = opts.userData;
    // do some file parsing. here, we're actually using pre-processed data...
    // so just add some bias and bail!
    const result = {};
    const X = userData.files.map(file => {
      const surf = new FreeSurfer({
        string: fs.readFileSync(file.filename).toString(),
      });

      // Pluck features to assess
      return pickFeatures(surf);
    });
    result.biasedX = this.addBias(n.transpose([X]));
    result.y = userData.files.map((file) => (file.tags.isControl ? 1 : -1));
    result.lambda = userData.lamba || 0.0;
    result.eta = userData.eta || 1e-1;
    result.numFeatures = numeric.dim(result.biasedX)[1];
    console.log(result);
    return result;
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
    console.log(`gradient: ${result.lGrad}, objective: ${result.lObj}`);
    return result;
  },
};
