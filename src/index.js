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
      if (userStep === groupStep) { return cb(); }
      if (serverKickoff) {
        return cb();
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
      const _default = { step: 1, userStep: {} };

      // construct our current group data from default and past values
      const result = Object.assign({}, _default, opts.previousData);

      // apply user current step(s) to our RemoteComputationResult
      opts.userResults.forEach(usrRslt => {
        result.userStep[usrRslt.username] = usrRslt.data.step;
      });

      // determine if computation should bump computation step
      const userStepValues = values(result.userStep);
      const allUsersMatch = userStepValues.every(uStep => uStep === result.step);
      const allUsersPresent = userStepValues.length === opts.usernames.length;
      const shouldBumpStep = allUsersMatch && allUsersPresent;
      if (!allUsersPresent) { return cb(null, { kickoff: true }); }
      else {
        delete opts.previousData.kickoff;
      }

      remoteRunner.run(opts, (err, data) => {
        if (err) { return cb(err); }
        data = Object.assign(result, data);
        if (data.step === 100 && allUsersMatch) {
          data.complete = true;
        } else if (shouldBumpStep) {
          data.step += 1;
        }
        // show output for demo
        console.log(data);
        cb(null, data);
      });
    },
    verbose: true,
  },
};
