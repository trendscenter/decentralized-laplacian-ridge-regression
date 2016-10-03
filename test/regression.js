'use strict';

const regression = require('../src/regression');
const tape = require('tape');

const w = [0.9805152699316935, 0.3628523252594045, 0.9723452437464188];
const xVals = [
  [28, 1, 1],
  [29, -1, 1],
  [31, 1, 1],
];
const yVals = [595000, 565250, 595000];

function isNumber(val) {
  return typeof val === 'number' && !Number.isNaN(val);
}

tape('gradient', (t) => {
  const grad = regression.gradient(w, xVals, yVals);

  t.ok(Array.isArray(grad), 'is an array');
  t.ok(grad.every(isNumber), 'contains only numbers');
  t.end();
});

tape('objective', (t) => {
  const obj = regression.objective(w, xVals, yVals);

  t.ok(isNumber(obj), 'is number');
  t.end();
});

