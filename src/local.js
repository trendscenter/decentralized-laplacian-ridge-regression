'use strict';

const regression = require('./regression');
const numeric = require('numeric');

module.exports = {
  addBias(A) {
    const n = numeric;
    const tPose = n.transpose(A);
    const withBias = tPose.concat([n.rep([n.dim(A)[0]], 1)]);
    return n.transpose(withBias);
  },

  // @TODO assert proper array dims
  run(opts) {
    const remoteData = opts.remoteResult ? opts.remoteResult.data : null;
    const localData = opts.previousData || {};
    const userData = opts.userData;
    let localLambda;

    // @TODO userData will likely be files.  need to parse user input first
    const parsed = userData;

    parsed.X = this.addBias(parsed.X);
    // console.log('parsed: ', parsed)
    if (!remoteData) {
      localData.kickoff = true;
      localData.lambda = localLambda = userData.lamba || 0.0;
      localData.eta = userData.eta || 1e-1;
      localData.numFeatures = numeric.dim(parsed.X)[1];
      return localData;
    }
    const localW = remoteData.currW;
    localLambda = remoteData.lambda;

    // clean kickoff user s.t. his/her results fall in line with other users
    delete localData.lambda;
    delete localData.kickoff;
    delete localData.eta;
    delete localData.numFeatures;

    // begin processing
    localData.lGrad = regression.gradient(localW, parsed.X, parsed.y, localLambda);
    localData.lObj = regression.objective(localW, parsed.X, parsed.y, localLambda);
    return localData;
  },
};
