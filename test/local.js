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
  }
}

tape('addBias', t => {
  const r = local.addBias([[1, 2, 3], [4, 5, 6]]);
  t.deepEquals(r, [[1, 2, 3, 1], [4, 5, 6, 1]], 'bias adds');
  t.end();
});

tape('preprocess errors', t => {
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

tape('preprocess', t => {
  const lambda = 123;
  const eta = 456;

  const result1 = local.preprocess(getPreprocessOpts({
    inputs: [[['TotalGrayVol', 'Left-Hippocampus']]],
  }));
  const result2 = local.preprocess(getPreprocessOpts({
    inputs: [[['TotalGrayVol', 'Left-Hippocampus']]],
    userData: {
      eta,
      lambda,
    },
  }));

  t.ok(
    'eta' in result1 && typeof result1.eta === 'number',
    'sets default eta'
  );
  t.ok(
    'lambda' in result1 && typeof result1.lambda === 'number',
    'sets default lambda'
  );

  t.deepEqual(
    result1.biasedX,
    [[595000, 1], [565250, 1], [595000, 1]],
    'adds bias to picked "X"'
  );
  t.equal(result1.numFeatures, 2, 'sets number of features');
  t.deepEqual(
    result1.y,
    [1, -1, 1],
    'pulls "y" from files\' tags'
  );

  t.equal(result2.eta, eta, 'sets eta from user data');
  t.equal(result2.lambda, lambda, 'sets lambda from user data');

  t.end();
});

tape('local run', t => {
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

