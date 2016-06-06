'use strict';

const pkg = require('../package.json');
const local = require('./local');
const remote = require('./remote');

module.exports = {
  name: pkg.name,
  version: pkg.version,
  plugins: ['group-step'],
  local: {
    type: 'function',
    fn(opts) {
      const r = local.run(opts);
      if (r) console.log(r);
      return r;
    },
    verbose: true,
  },
  remote: {
    type: 'function',
    fn(opts) {
      const r = remote.run(opts);
      if (r) console.log(r);
      return r;
    },
    verbose: true,
  },
};
