const path = require('path');

const remote = require('../src/remote');

module.exports = {
  computationPath: path.resolve(__dirname, '../src/index.js'),
  users: [
    {
      username: 'jessica',
      userData: {
        files: [
          // controls
          { filename: path.resolve(__dirname, 'demo/controls/M00000001.txt'), tags: { isControl: true } },
          { filename: path.resolve(__dirname, 'demo/controls/M00000002.txt'), tags: { isControl: true } },
          { filename: path.resolve(__dirname, 'demo/controls/M00000003.txt'), tags: { isControl: true } },
          { filename: path.resolve(__dirname, 'demo/controls/M00000004.txt'), tags: { isControl: true } },
          { filename: path.resolve(__dirname, 'demo/controls/M00000005.txt'), tags: { isControl: true } },
          // substance users
          { filename: path.resolve(__dirname, 'demo/substanceUsers/M00000011.txt'), tags: { isControl: false } },
          { filename: path.resolve(__dirname, 'demo/substanceUsers/M00000012.txt'), tags: { isControl: false } },
          { filename: path.resolve(__dirname, 'demo/substanceUsers/M00000013.txt'), tags: { isControl: false } },
          { filename: path.resolve(__dirname, 'demo/substanceUsers/M00000014.txt'), tags: { isControl: false } },
          { filename: path.resolve(__dirname, 'demo/substanceUsers/M00000015.txt'), tags: { isControl: false } },
        ],
      },
    }, {
      username: 'jamal',
      userData: {
        files: [
          // controls
          { filename: path.resolve(__dirname, 'demo/controls/M00000006.txt'), tags: { isControl: true } },
          { filename: path.resolve(__dirname, 'demo/controls/M00000007.txt'), tags: { isControl: true } },
          { filename: path.resolve(__dirname, 'demo/controls/M00000008.txt'), tags: { isControl: true } },
          { filename: path.resolve(__dirname, 'demo/controls/M00000009.txt'), tags: { isControl: true } },
          { filename: path.resolve(__dirname, 'demo/controls/M00000010.txt'), tags: { isControl: true } },
          // substance users
          { filename: path.resolve(__dirname, 'demo/substanceUsers/M00000016.txt'), tags: { isControl: false } },
          { filename: path.resolve(__dirname, 'demo/substanceUsers/M00000017.txt'), tags: { isControl: false } },
          { filename: path.resolve(__dirname, 'demo/substanceUsers/M00000018.txt'), tags: { isControl: false } },
          { filename: path.resolve(__dirname, 'demo/substanceUsers/M00000019.txt'), tags: { isControl: false } },
          { filename: path.resolve(__dirname, 'demo/substanceUsers/M00000020.txt'), tags: { isControl: false } },
        ],
      },
    },
  ],
  server: {
    preRun: [
      () => {
        // remove randomness from simulation
        remote.defaultW = [0.1, 0.1];
        /* eslint-disable no-console */
        console.log(`stubbing in defaultW as ${remote.defaultW}`);
        /* eslint-enable no-console */
      },
    ],
  },
  verbose: true,
};
