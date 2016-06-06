'use strict';

const pkg = require('../package.json');
const localRunner = require('./local');
const remoteRunner = require('./remote');

module.exports = {
  name: pkg.name,
  version: pkg.version,
  plugins: ['group-step'],
  local: {
    type: 'function',
    fn(opts) {
      return localRunner.run(opts)
      .then((data) => {
        if (data) console.log(data);
        return data;
      });
    },
    verbose: true,
  },
  remote: {
    type: 'function',
    fn(opts) {
      remoteRunner.run(opts)
      .then((data) => {
        if (data) console.log(data);
        return data;
      });
    },
    verbose: true,
  },
};
