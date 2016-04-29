'use strict';

const n = require('numeric');
const values = require('lodash/values');

module.exports = {

  defaultW: null, // may be overwritten for unit testing

  /**
   * compute server entry point
   * @param {object} opts
   * @param {function} cb
   * @returns {undefined}
   */
  run(opts, cb) {
    const userResults = opts.userResults;
    const r = Object.assign({
      currW: null,
      prevW: null,
      prevObjective: null,
      currObjective: null,
      eta: null,
    }, opts.previousData || {});

    // initialize group data
    if (userResults[0].data.kickoff) {
      const kickoff = userResults[0].data;
      r.currW = r.prevW = this.defaultW || n.random([kickoff.numFeatures]);
      r.prevObjective = 1e15;
      r.prevGradient = n.rep([kickoff.numFeatures], 0);
      r.eta = userResults[0].data.eta;
      r.lambda = userResults[0].data.lambda;
      return cb(null, r);
    }

    // wait for all users ready
    const userStepValues = values(r.userStep);
    const allUsersMatch = userStepValues.every(uStep => uStep === userStepValues[0]);
    const allUsersPresent = opts.userResults.length === opts.usernames.length;
    const shouldBumpStep = allUsersMatch && allUsersPresent;
    if (!allUsersPresent || !allUsersMatch) {
      console.log('allUsersMatch', allUsersMatch);
      return cb();
    }
    if (r.step === 100) {
      r.complete = true;
      return cb(null, r);
    }
    if (shouldBumpStep) {
      r.step += 1;
    }
    delete r.kickoff;

    r.currObjective = userResults.reduce((prev, rslt) => prev + rslt.data.lObj, 0);

    if (r.currObjective > r.prevObjective) {
      r.eta = r.eta / 2;
      r.currW = n.sub(r.prevW, n.mul(r.prevGradient, r.eta));
      r.halvedEta = true;
    } else {
      // if (!r.halvedEta) {
      r.prevGradient = userResults.reduce((prev, rslt) => n.add(prev, rslt.data.lGrad), 0);
      // } else {
      r.currW = n.sub(r.prevW, n.mul(r.prevGradient, r.eta));
      r.halvedEta = false;
      // }
      r.prevObjective = r.currObjective;
      r.prevW = r.currW;
    }

    return cb(null, r);
  },
};
