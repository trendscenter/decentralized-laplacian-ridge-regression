'use strict';

const distributions = require('distributions');
const get = require('lodash/get');
const n = require('numeric');
const DEFAULT_MAX_ITERATIONS = require('./constants').DEFAULT_MAX_ITERATIONS;

const DEFAULT_OBJECTIVE = 1e15;
const GRADIENT_TOLERANCE = 1e-3;

module.exports = {
  defaultW: null, // may be overwritten for unit testing

  assertUserDatas(opts) {
    opts.userResults.forEach((usrRslt, ndx, arr) => {
      if (ndx === 0) { return; }
      const numFeatures = usrRslt.data.numFeatures;
      const lastNumFeatures = arr[ndx - 1].data.numFeatures;
      if (numFeatures !== lastNumFeatures) {
        const un = usrRslt.username;
        const lastUn = arr[ndx - 1].username;
        throw new Error([
          `${un} reports ${numFeatures} features, but ${lastUn}`,
          `reports ${lastNumFeatures} features.`,
        ].join(' '));
      }
    });
  },

  /**
   * compute server entry point
   * @param {Object} opts
   * @param {Object} opts.pluginState
   * @param {(Object|null)} opts.previousData
   * @param {string[]} opts.usernames
   * @param {Object[]} opts.userResults Collection of users' local results
   * documents
   * @returns {Object}
   */
  run(opts) {
    const userResults = opts.userResults;
    const r = Object.assign({
      currW: null,
      prevW: null,
      prevObjective: null,
      currObjective: null,
      eta: null,
      iteration: 0,
    }, opts.previousData || {});

    const maxIterationCount = get(
      opts,
      'pluginState.inputs[0][1]',
      DEFAULT_MAX_ITERATIONS
    );

    this.assertUserDatas(opts);

    // initialize group data
    if (r.iteration === 0) {
      const firstUserResult = userResults[0].data;
      r.currW = r.prevW = this.defaultW || n.random([firstUserResult.numFeatures]);
      r.prevObjective = DEFAULT_OBJECTIVE;
      r.Gradient = n.rep([firstUserResult.numFeatures], 0);
      r.eta = userResults[0].data.eta;
      r.lambda = userResults[0].data.lambda;
      r.Eg2 = n.rep([firstUserResult.numFeatures], 0);
      r.EdW = n.rep([firstUserResult.numFeatures], 0);
      r.rho = 0.5; // watch out for this and the eps
      r.eps = 0.1;
      r.deltaW = 0;
      r.iteration = 1;
      return r;
    }
    r.iteration += 1;

    r.currObjective = userResults.reduce((prev, rslt) => prev + rslt.data.lObj, 0);

    // ADADELTA
    r.Gradient = userResults.reduce((prev, rslt) => n.add(prev, rslt.data.lGrad), 0);
    r.Eg2 = n.add(n.mul(r.rho, r.Eg2), n.mul(1 - r.rho, n.mul(r.Gradient, r.Gradient)));
    r.deltaW = n.mul(-1, n.mul(n.div(n.sqrt(n.add(r.EdW, r.eps)), n.sqrt(n.add(r.Eg2, r.eps))), r.Gradient)); // eslint-disable-line
    r.EdW = n.add(n.mul(r.rho, r.EdW), n.mul(1 - r.rho, n.mul(r.deltaW, r.deltaW)));
    r.currW = n.add(r.prevW, r.deltaW);

    // test for halting conditions.
    if (
      r.currObjective > r.prevObjective ||
      n.norm2(r.Gradient) < GRADIENT_TOLERANCE ||
      r.iteration === maxIterationCount
    ) {
    // indicate the iteration for searching converged W is ended
      r.endOfIteration = true;
      r.statisticStep = 0;
      return r;
    }

    // continue iterating.
    r.prevObjective = r.currObjective;
    r.prevW = r.currW;

    console.log(r); // eslint-disable-line no-console

    return r;
  },

  getStatistics(opts) {
    // Extract X and y variate name from userData
    const xLabel = Object.keys(opts.userResults[0].userData.files[0].tags);
    /* eslint-disable no-underscore-dangle */
    const yLabel = opts.userResults[0].userData.__DECLARATION_INPUTS_KEY__[0][0];
    /* eslint-enable no-underscore-dangle */

    if (
      opts.userResults[0].data.endOfIteration === true &&
      opts.userResults[0].data.statisticStep === 0
    ) {
      // if statisticStep==0, remote node calculates the globalMeanY and return it to local node
      const userResults = opts.userResults;

      // Not all user results contain betas. Return early.
      if (userResults.some(userResult => !((userResult || {}).data || {}).betaVector)) {
        return {};
      }

      // calculate averageBetaVector
      const currW = opts.previousData.currW;

      // calculate globalMeanY
      const siteCount = userResults.length;
      let totalY = 0;
      let globalYCount = 0;

      for (let i = 0; i < siteCount; i += 1) {
        totalY += userResults[i].data.localMeanY * userResults[i].data.localCount;
        globalYCount += userResults[i].data.localCount;
      }

      const globalMeanY = totalY / globalYCount;

      /* eslint-disable no-console */
      console.log('currW :', currW);
      console.log('globalMeanY is :', globalMeanY);
      /* eslint-enable no-console */

      return { currW,
        globalMeanY,
        endOfIteration: true,
        statisticStep: 1,
      };
    } else if (
      opts.userResults[0].data.endOfIteration === true &&
      opts.userResults[0].data.statisticStep === 1
    ) {
      // if statisticStep==1, remote node calculates the global statistics

      const userResults = opts.userResults;

      // get passed parameters from local nodes
      const currW = opts.previousData.currW;
      const betaVectorLocal = userResults.map(r => r.data.betaVector);
      const rSquaredLocalOriginal = userResults.map(r => r.data.rSquared);
      const tValueLocalOriginal = userResults.map(r => r.data.tValue);
      const pValueLocalOriginal = userResults.map(r => r.data.pValue);
      const rSquaredLocal = userResults.map(r => r.data.rSquaredLocal);
      const tValueLocal = userResults.map(r => r.data.tValueLocal);
      const pValueLocal = userResults.map(r => r.data.pValueLocal);

      // calculate global parameters
      const sseGlobal = userResults.reduce(
        (sum, userResult) => sum + userResult.data.sseLocal, 0
      );
      const sstGlobal = userResults.reduce(
        (sum, userResult) => sum + userResult.data.sstLocal, 0
      );
      const globalYCount = userResults.reduce(
        (sum, userResult) => sum + userResult.data.localCount, 0
      );
      const betaCount = currW.length;
      const varError = (1 / (globalYCount - 2)) * sseGlobal;
      const varXGlobal = [];
      const seBetaGlobal = [];
      const tValueGlobal = [];

      // calculate tValueGlobal
      for (let i = 0; i < betaCount; i += 1) {
        varXGlobal[i] = userResults.reduce(
          (sum, userResult) => sum + userResult.data.varXLocal[i], 0
        );
        seBetaGlobal[i] = Math.sqrt(varError / varXGlobal[i]);
        tValueGlobal[i] = currW[i] / seBetaGlobal[i];
      }

      // calculate r squared global
      const rSquaredGlobal = 1 - (sseGlobal / sstGlobal);

      // add t to p value transformation //
      /* eslint-disable new-cap */
      const tdist = distributions.Studentt(globalYCount - 1);
      /* eslint-enable new-cap */
      const tcdf = tValueGlobal.map(r => tdist.cdf(r));
      const pValueGlobal = n.mul(2, (n.sub(1, tcdf))); // two tail pValue

      /* eslint-disable no-console */
      console.log('The global r squared for currW :', rSquaredGlobal);
      console.log('The global t Values for currW :', tValueGlobal);
      console.log('The global p Values for currW :', pValueGlobal);
      /* eslint-enable no-console */

      return {
        betaVectorLocal,
        currW,
        rSquaredLocalOriginal,
        tValueLocalOriginal,
        pValueLocalOriginal,
        rSquaredLocal,
        tValueLocal,
        pValueLocal,
        rSquaredGlobal,
        tValueGlobal,
        pValueGlobal,
        xLabel,
        yLabel,
        complete: true,
      };
    }

    return this.run(opts);
  },
};
