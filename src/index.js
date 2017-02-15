'use strict';

const FreeSurfer = require('freesurfer-parser');
const pkg = require('../package.json');
const localRunner = require('./local');
const remoteRunner = require('./remote');
const regression = require('./regression');
const n = require('numeric');
const distributions = require('distributions');
const { DEFAULT_LAMBDA, DEFAULT_MAX_ITERATIONS } = require('./constants.js');
const get = require('lodash/get');

module.exports = {
  name: pkg.name,
  version: pkg.version,
  plugins: ['group-step', 'inputs'],
  local: [
    {
      type: 'function',
      fn(opts) {
        // simulate pre-processing step.  we actually are passing in
        // pre-processed data. required s.t. remote compute node can assert
        // that all users have correct data shape (e.g. num features)
        const rslt = localRunner.preprocess(opts);
        console.log('pre-processing complete.'); // eslint-disable-line no-console
        return rslt;
      },
      verbose: true,
      inputs: [{
        help: 'Select Freesurfer region(s) of interest',
        label: 'Freesurfer ROI',
        type: 'select',
        values: FreeSurfer.validFields,
      }, {
        defaultValue: DEFAULT_MAX_ITERATIONS,
        label: 'Iteration count',
        type: 'number',
      }, {
        defaultValue: DEFAULT_LAMBDA,
        label: 'Lambda',
        max: 1,
        min: 0,
        step: 0.05,
        type: 'number',
      }, {
        defaultValue: [{
          name: 'Is Control?',
          type: 'boolean',
        }],
        label: 'Covariates',
        /**
         * @todo Determine a better `type` for this input. Something like
         * "data-map" or "covariate-map" or…something.
         */
        type: 'covariates',
      }],
    }, {
      type: 'function',
      fn(opts) {
      // if W doesn't merge, return run(), if W merge, return statistic()

        /* eslint-disable no-console */
        console.log('opts.remoteResult.data.endOfIteration is', opts.remoteResult.data.endOfIteration);
        console.log('opts.remoteResult.data.statisticStep is', opts.remoteResult.data.statisticStep);
        /* eslint-enable no-console */

        if (
          (opts.remoteResult.data.endOfIteration === true) &&
          (opts.remoteResult.data.statisticStep === 0)
        ) {
          const lambda = get(opts, 'remoteResult.data.lambda');

          // step 0 calculate local statistics and localYMean
          const biasedX = opts.previousData.biasedX;
          const y = opts.previousData.y;
          const localCount = y.length;
          const betaVector = regression.oneShot(biasedX, y, lambda);
          const rSquared = regression.rSquared(biasedX, y, betaVector);
          const tValue = regression.tValue(biasedX, y, betaVector);
          /* eslint-disable new-cap */
          const tdist = distributions.Studentt(localCount - betaVector.length);
          /* eslint-enable new-cap */
          const tcdf = tValue.map(r => tdist.cdf(Math.abs(r)));
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
          opts.remoteResult.data.endOfIteration === true &&
          opts.remoteResult.data.statisticStep === 1
        ) {
          // step 1 receive the globalMeanY and currW, then calculate sseLocal,
          // sstLocal and varXLocal
          const betaVector = opts.previousData.betaVector;
          const globalMeanY = opts.remoteResult.data.globalMeanY;
          const currW = opts.remoteResult.data.currW;
          const biasedX = opts.previousData.biasedX;
          const y = opts.previousData.y;
          const rSquared = opts.previousData.rSquared;
          const tValue = opts.previousData.tValue;
          const pValue = opts.previousData.pValue;
          const localCount = y.length;

          // calculate the local r squred and t value for averageBetaVector)
          const rSquaredLocal = regression.rSquared(biasedX, y, currW);
          const tValueLocal = regression.tValue(biasedX, y, currW);
          /* eslint-disable new-cap */
          const tdist = distributions.Studentt(localCount - betaVector.length);
          /* eslint-enable new-cap */
          const tcdf = tValueLocal.map(r => tdist.cdf(Math.abs(r)));
          const pValueLocal = n.mul(2, n.sub(1, tcdf));

          // calculate sseLocal and sstLocal
          const sseLocal = n.sum(n.pow(n.sub(y, n.dot(biasedX, currW)), 2));
          const sstLocal = n.sum(n.pow(n.sub(y, n.rep(n.dim(y), globalMeanY)), 2));

          // calculate varXLocalMatrix
          const varXLocalMatrix = n.dot(n.transpose(biasedX), biasedX);

          /* eslint-disable no-console */
          console.log('local r squared for currW', rSquaredLocal);
          console.log('local t Values for currW', tValueLocal);
          console.log('local p Values for currW', pValueLocal);
          /* eslint-enable no-console */

          return {
            betaVector,
            sseLocal,
            sstLocal,
            varXLocalMatrix,
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

        return localRunner.run(opts);
      },
      verbose: true,
    },
  ],
  remote: {
    type: 'function',
    fn(opts) {
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

        const varError = (1 / (globalYCount - currW.length)) * sseGlobal;
        const seBetaGlobal = [];
        const tValueGlobal = [];

        // calculate tValueGlobal
        let varXGlobalMatrix = n.rep([currW.length, currW.length], 0);

        for (let i = 0; i < userResults.length; i += 1) {
          varXGlobalMatrix = n.add(varXGlobalMatrix, userResults[i].data.varXLocalMatrix);
        }

        /* eslint-disable no-console */
        console.log('varXGlobalMatrix is', varXGlobalMatrix);
        /* eslint-enable no-console */

        const varBetaGlobal = n.mul(n.inv(varXGlobalMatrix), varError);

        for (let i = 0; i < currW.length; i += 1) {
          seBetaGlobal[i] = Math.sqrt(varBetaGlobal[i][i]);
          tValueGlobal[i] = currW[i] / seBetaGlobal[i];
        }

        // calculate r squared global
        const rSquaredGlobal = 1 - (sseGlobal / sstGlobal);

        // add t to p value transformation //
        /* eslint-disable new-cap */
        const tdist = distributions.Studentt(globalYCount - currW.length);
        /* eslint-enable new-cap */
        const tcdf = tValueGlobal.map(r => tdist.cdf(Math.abs(r)));
        const pValueGlobal = n.mul(2, (n.sub(1, tcdf))); // two tail pValue

        /* eslint-disable no-console */
        console.log('The global r squared for currW :', rSquaredGlobal);
        console.log('The global t Values for currW :', tValueGlobal);
        console.log('The global p Values for currW :', pValueGlobal);
        /* eslint-enable no-console */

        const result = {
          complete: true,
          global: {
            betaVector: currW,
            pValue: pValueGlobal,
            rSquared: rSquaredGlobal,
            tValue: tValueGlobal,
          },
        };

        /**
         * Iterate over users' statistics and append to results document.
         *
         * @todo Improve performance by removing redundant iteration.
         */
        betaVectorLocal.forEach((betaVector, i) => {
          result[i] = {
            betaVector,
            pValue: pValueLocal[i],
            pValueOriginal: pValueLocalOriginal[i],
            rSquared: rSquaredLocal[i],
            rSquaredOriginal: rSquaredLocalOriginal[i],
            tValue: tValueLocal[i],
            tValueOriginal: tValueLocalOriginal[i],
          };
        });

        return result;
      }

      return remoteRunner.run(opts);
    },
    verbose: true,
  },
};
