'use strict';

const local = require('../src/local');
const path = require('path');
const tape = require('tape');

function getPreprocessOpts(options) {
  const inputs = typeof options !== 'undefined' && 'inputs' in options ?
    options.inputs :
    [];
  const userData = typeof options !== 'undefined' && 'userData' in options ?
    options.userData :
    undefined;

  return {
    remoteResult: {
      pluginState: {
        inputs,
      },
    },
    userData: Object.assign({
      files: [{
        filename: path.resolve(__dirname, 'demo/controls/M00000001.txt'),
        tags: {
          age: 28,
          isControl: true,
        },
      }, {
        filename: path.resolve(__dirname, 'demo/substanceUsers/M00000011.txt'),
        tags: {
          age: 29,
          isControl: false,
        },
      }, {
        filename: path.resolve(__dirname, 'demo/controls/M00000002.txt'),
        tags: {
          age: 31,
          isControl: true,
        },
      }],
    }, userData),
  };
}

tape('addBias', (t) => {
  t.throws(local.addBias.bind(null), 'throws with no value');
  t.throws(local.addBias.bind(null, 'hi'), 'throws with non-array value');
  t.throws(local.addBias.bind(null, []), 'throws with empty array value');
  t.throws(
    local.addBias.bind(null, [[], 'hi']),
    'throws with non-array item'
  );
  const r = local.addBias([[1, 2, 3], [4, 5, 6]]);
  t.deepEquals(r, [[1, 2, 3, 1], [4, 5, 6, 1]], 'bias adds');
  t.end();
});

tape('get normalized tags', (t) => {
  t.deepEqual(
    local.getNormalizedTags({
      z: true,
      a: 'string',
      b: false,
      c: 300,
    }),
    [-1, 300, 1],
    'returns normalized array'
  );
  t.end();
});

tape('preprocess errors', (t) => {
  t.throws(
    local.preprocess.bind(null, getPreprocessOpts({
      inputs: null,
    })),
    'throws with no inputs'
  );
  t.throws(
    local.preprocess.bind(null, getPreprocessOpts({
      inputs: [['WAT']],
    })),
    'throws with non-array features'
  );
  t.throws(
    local.preprocess.bind(null, getPreprocessOpts({
      inputs: [[[]]],
    })),
    'throws with empty features'
  );
  t.throws(
    local.preprocess.bind(null, getPreprocessOpts({
      inputs: [[['WAT']]],
    })),
    /WAT/,
    'throws with invalid Freesurfer region'
  );
  t.end();
});

tape('preprocess', (t) => {
  const lambda = 123;
  const eta = 456;

  t.plan(7);

  local.preprocess(getPreprocessOpts({
    inputs: [[['TotalGrayVol', 'Left-Hippocampus']]],
  }))
    .then((result) => {
      t.ok(
        'eta' in result && typeof result.eta === 'number',
        'sets default eta'
      );
      t.ok(
        'lambda' in result && typeof result.lambda === 'number',
        'sets default lambda'
      );

      t.deepEqual(
        result.biasedX,
        [[28, 1, 1], [29, -1, 1], [31, 1, 1]],
        'transforms files\' tags to co-variates in `biasedX`'
      );
      t.deepEqual(
        result.y,
        [595000, 565250, 595000],
        'pulls selected feature from FreeSurfer files'
      );
      t.equal(result.numFeatures, 2, 'sets number of features');

      return local.preprocess(getPreprocessOpts({
        inputs: [[['TotalGrayVol', 'Left-Hippocampus']]],
        userData: {
          eta,
          lambda,
        },
      }));
    })
    .then((result) => {
      t.equal(result.eta, eta, 'sets eta from user data');
      t.equal(result.lambda, lambda, 'sets lambda from user data');
    })
    .catch(t.end);
});

tape('local run', (t) => {
  const opts = {
    previousData: {
      biasedX: [[100, 1], [100, 1]],
      eta: 1e-4,
      kickoff: true,
      lambda: 0.05,
      numFeatures: 2,
      y: [1, -1],
    },
    remoteResult: {
      data: {
        currW: [0, 1],
        lambda: 1e-3,
      },
    },
  };
  const result = local.run(opts);

  t.ok(
    !('lambda' in result) &&
    !('kickoff' in result) &&
    !('eta' in result) &&
    !('numFeatures' in result),
    'removes unneeded properties'
  );
  t.ok('lGrad' in result, 'adds gradient');
  t.ok('lObj' in result, 'adds objective');
  t.end();
});

