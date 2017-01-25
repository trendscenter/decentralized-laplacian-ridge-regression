'use strict';

const get = require('lodash/get');
const n = require('numeric');
const { DEFAULT_MAX_ITERATIONS, RUN_STEP_KEY } = require('./constants');
const regression = require('./regression');

const DEFAULT_OBJECTIVE = 1e15;
const GRADIENT_TOLERANCE = 1e-3;

function assertUserDatas(opts) {
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
}

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
function iterate(opts) {
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

  assertUserDatas(opts);
  console.log('remote.run fired'); // eslint-disable-line no-console

  // initialize group data
  if (r.iteration === 0) {
    const firstUserResult = userResults[0].data;
    r.currW = r.prevW = module.exports.defaultW || n.random([firstUserResult.numFeatures]);
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
    r[RUN_STEP_KEY] = 1;

    console.log('remote.run complete', r); // eslint-disable-line no-console
    return r;
  }

  // continue iterating.
  r.prevObjective = r.currObjective;
  r.prevW = r.currW;

  console.log('remote.run continuing', r); // eslint-disable-line no-console

  return r;
}

/**
 * Get intial statistics.
 *
 * @param {Object} opts
 * @param {Object} opts.previousData
 * @param {Object[]} opts.userResults
 * @returns {Object}
 */
function getInitialStatistics({
  previousData,
  previousData: { currW },
  userResults,
}) {
  // Not all user results contain betas. Return early.
  if (userResults.some(userResult => !get(userResult, 'data.betaVector'))) {
    console.log('remote.getInitialStatistics: return early');
    return previousData;
  }

  let globalYCount = 0;
  let totalY = 0;

  userResults.forEach(
    ({
      data: { meanY, y },
    }) => {
      const yCount = y.length;

      globalYCount += yCount;
      totalY += meanY * yCount;
    }
  );

  const response = {
    [RUN_STEP_KEY]: 2,
    currW,
    globalMeanY: totalY / globalYCount,
  };

  console.log('remote.getInitialStatistics', response); // eslint-disable-line no-console

  return response;
}

/**
 * Get final statistics.
 *
 * @param {Object} opts
 * @param {Object} opts.previousData
 * @param {Object[]} opts.userResults
 * @returns {Object}
 */
function getFinalStatistics({
  previousData: {
    currW,
  },
  userResults,
}) {
  console.log('remote.getFinalStatistics', userResults); // eslint-disable-line no-console

  /**
   * Create a data structure that mirrors src/local.js's
   * `getFinalStatistics`'s return value, then iterate over all users' results
   * and accumulate values.
   */
  const totals = userResults.reduce(
    (
      memo,
      {
        data: { local, original },
      }
    ) => {
      /* eslint-disable no-param-reassign */
      memo.local.betaVector.push(local.betaVector);
      memo.local.pValue.push(local.pValue);
      memo.local.rSquared.push(local.rSquared);
      memo.local.sse += local.sse;
      memo.local.sst += local.sst;
      memo.local.tValue.push(local.tValue);
      memo.local.yCount += local.yCount;
      memo.original.pValue.push(original.pValue);
      memo.original.rSquared.push(original.rSquared);
      memo.original.tValue.push(original.tValue);
      /* eslint-enable no-param-reassign */

      return memo;
    },
    {
      local: {
        betaVector: [],
        pValue: [],
        rSquared: [],
        sse: 0,
        sst: 0,
        tValue: [],
        yCount: 0,
      },
      original: {
        pValue: [],
        rSquared: [],
        tValue: [],
      },
    }
  );

  const varError = (1 / (totals.local.yCount - 2)) * totals.local.sse;
  const tValue = currW.reduce(
    (memo, beta, index) => {
      const x = userResults.reduce(
        (sum, userResult) => sum + userResult.data.varXLocal[index],
        0
      );
      const standardErrorBeta = Math.sqrt(varError / x);

      return memo.concat(beta / standardErrorBeta);
    },
    []
  );

  const response = {
    [RUN_STEP_KEY]: 3,
    complete: true,
    currW,
    global: {
      pValue: regression.getPValue(totals.local.yCount - 1, tValue),
      rSquared: 1 - (totals.local.sse / totals.local.sst),
      tValue,
    },
    local: totals.local,
    original: totals.original,
  };

  console.log('remote.getFinalStatistics', response); // eslint-disable-line no-console

  return response;
}

module.exports = {
  defaultW: null, // may be overwritten for unit testing

  /**
   * Remote run.
   *
   * @param {Object} options
   * @param {Object} options.previousData
   * @returns {Object}
   */
  run(options) {
    const runStep = get(options, `previousData.${RUN_STEP_KEY}`, 0);

    console.log('Remote run step: %d', runStep);

    if (runStep === 1) {
      return getInitialStatistics(options);
    } else if (runStep === 2) {
      return getFinalStatistics(options);
    }

    return iterate(options);
  },
};

