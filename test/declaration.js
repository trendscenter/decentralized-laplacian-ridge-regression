const path = require('path');
const n = require('numeric');
module.exports = {
  computationPath: path.resolve(__dirname, '../src/index.js'),
  users: [
    {
      username: 'user1',
      userData: {
        X: n.transpose([[1, 2, 3, 4, 5]]), // 5 samples, one input (or feature) per sample
        y: [11, 12, 13, 14, 15],
        raw: true,
      },
    }, {
      username: 'user2',
      userData: {
        X: n.transpose([[6, 7, 8, 9, 10]]),
        y: [16, 17, 18, 19, 20],
        raw: true,
      },
    },
  ],
  server: {
    preRun: [
      (done) => {
        // remove randomness from simulation
        // late require _required_ as different process will be runnign this script
        const remote = require('../src/remote'); // eslint-disable-line
        remote.defaultW = [9, 2];
        done();
      },
    ],
  },
  verbose: true,
};
