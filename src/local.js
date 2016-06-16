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

  preprocess(opts) {
    const userData = opts.userData;
    // do some file parsing. here, we're actually using pre-processed data...
    // so just add some bias and bail!
    const result = {};
    const X = userData.files
    .map((file) => fs.readFileSync(file.filename).toString())
    .map((strSurf) => new FreeSurfer({ string: strSurf }))
    .map((surf) => surf.TotalGrayVol); // <== feature to assess!
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
