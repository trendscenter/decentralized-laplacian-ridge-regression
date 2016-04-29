'use strict';

const pkg = require('../package.json');
const values = require('lodash/values');
const localRunner = require('./local');
const remoteRunner = require('./remote');
const get = require('lodash/get');

module.exports = {
  name: pkg.name,
  version: pkg.version,
  local: {
    type: 'function',
    fn(opts, cb) {
      const serverKickoff = get(opts, 'remoteResult.data.kickoff');
      const groupStep = get(opts, 'remoteResult.data.step') || 1;
      const userStep = opts.step = get(opts, 'previousData.step') || 0;
      if (userStep === groupStep) {
        return cb();
      } else if (!userStep && serverKickoff) {
        return cb(null, { step: 0 });
      }
      localRunner.run(opts, (err, data) => {
        if (err) { return cb(err); }
        data.step = data.kickoff ? 0 : (data.step || 0) + 1;
        console.log(data);
        cb(null, data);
      });
    },
    verbose: true,
  },
  remote: {
    type: 'function',
    fn(opts, cb) {
      // stub some default values
      opts.previousData = Object.assign({ step: 1, userStep: {} }, opts.previousData);

      // apply user current step(s) to our RemoteComputationResult
      opts.userResults.forEach(usrRslt => {
        opts.previousData.userStep[usrRslt.username] = usrRslt.data.step;
      });

      remoteRunner.run(opts, (err, data) => {
        if (err) { return cb(err); }
        // show output for demo
        console.log(data);
        cb(null, data);
      });
    },
    verbose: true,
  },
};
