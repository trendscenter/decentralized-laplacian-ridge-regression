'use strict';

const computation = require('../src/index.js');
const tape = require('tape');

tape('degrees of freedom', (t) => {
  function getUserResult(localCount) {
    return {
      data: {
        betaVector: [Math.random(), Math.random()],
        endOfIteration: true,
        localCount,
        statisticStep: 1,
        varXLocalMatrix: [
          [Math.random(), Math.random()],
          [Math.random(), Math.random()],
        ],
      },
    };
  }

  const result = computation.remote.fn({
    previousData: {
      currW: [Math.random(), Math.random()],
    },
    userResults: [getUserResult(100), getUserResult(50)],
  });

  t.equal(
    result.global.degreesOfFreedom,
    148,
    'returns global degrees of freedom'
  );
  t.ok(
    result[0].degreesOfFreedom === 98 &&
    result[1].degreesOfFreedom === 48,
    'returns users\'s degrees of freedom'
  );

  t.end();
});

