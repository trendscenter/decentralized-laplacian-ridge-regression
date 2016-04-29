'use strict';

const comp = require('../');
const local = require('../src/local');
const test = require('tape');

test('addBias', (t) => {
  const r = local.addBias([[1, 2, 3], [4, 5, 6]]);
  t.deepEquals(r, [[1, 2, 3, 1], [4, 5, 6, 1]], 'bias adds');
  t.end();
});


test('firstReply', (t) => {
  const pipelineInput = require('./user-pipeline-response-1-input');
  comp.local.fn(pipelineInput, (err, rslt) => {
    t.deepEquals({
      step: 1,
      lGrad: [
        -339.65,
        -109.65,
      ],
      lObj: 607.675,
    }, rslt, 'first iteration from server ok');
    t.end();
  });
});
