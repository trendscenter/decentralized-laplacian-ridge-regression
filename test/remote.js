'use strict';

const test = require('tape');
const firstRespose = require('./.input-first-server-response')();
const firstInput = require('./.input-srv-kickoff')();
const remote = require('../src/remote');
const comp = require('../');

test('remote first response', (t) => {
  remote.defaultW = firstRespose.data.currW;
  comp.remote.fn(firstInput, (err, rslt) => {
    if (err) { return t.fail(err.message); }

    t.deepEquals(
      { data: rslt },
      firstRespose,
      'first response ok'
    );
    t.end();
  });
});
