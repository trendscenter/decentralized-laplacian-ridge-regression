'use strict';

const pkg = require('../package.json');
const localRunner = require('./local');
const remoteRunner = require('./remote');

module.exports = {
  name: pkg.name,
  version: pkg.version,
  plugins: ['group-step'],
  local: [
    {
      type: 'function',
      fn(opts) {
        // simulate pre-processing step.  we actually are passing in
        // pre-processed data. required s.t. remote compute node can assert
        // that all users have correct data shape (e.g. num features)
        const rslt = localRunner.preprocess(opts);
        console.log('pre-processing complete.');
        return rslt;
      },
      verbose: true,
    }, {
      type: 'function',
      fn(opts) { return localRunner.run(opts); },
      verbose: true,
    },
  ],
  remote: {
    type: 'function',
    fn(opts) { return remoteRunner.run(opts); },
    verbose: true,
  },
};
