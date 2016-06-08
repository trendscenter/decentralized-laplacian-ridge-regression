'use strict';

const n = require('numeric');
const values = require('lodash/values');

module.exports = {
  defaultW: null, // may be overwritten for unit testing

  /**
   * compute server entry point
   * @param {object} opts
   * @returns {undefined}
   */
  run(opts) {
    const userResults = opts.userResults;
    const r = Object.assign({
      currW: null,
      prevW: null,
      prevObjective: null,
      currObjective: null,
      eta: null,
      step: 1,
      userStep: {},
    }, opts.previousData || {});

    // apply user current step(s) to our RemoteComputationResult
    userResults.forEach((usrRslt) => (r.userStep[usrRslt.username] = usrRslt.data.step));

    // initialize group data
    if (userResults[0].data.kickoff) {
      const kickoff = userResults[0].data;
      r.currW = r.prevW = this.defaultW || n.random([kickoff.numFeatures]);
      r.prevObjective = 1e15;
      r.Gradient = n.rep([kickoff.numFeatures], 0);
      r.eta = userResults[0].data.eta;
      r.lambda = userResults[0].data.lambda;
      r.Eg2 = n.rep([kickoff.numFeatures], 0);
      r.EdW = n.rep([kickoff.numFeatures], 0);
      r.rho = 0.99; // watch out for this and the eps
      r.eps = 1e-4;
      r.deltaW = 0;
      return r;
    }

    // wait for all users ready
    const userStepValues = values(r.userStep);
    const allUsersMatch = userStepValues.every(uStep => uStep === userStepValues[0]);
    const allUsersPresent = opts.userResults.length === opts.usernames.length;
    const shouldBumpStep = allUsersMatch && allUsersPresent;

    const tol = 1e-3;

    if (!allUsersPresent || !allUsersMatch) {
      return null;
    }
    if (r.step === 1000) {
      r.complete = true;
      return r;
    }
    if (shouldBumpStep) {
      r.step += 1;
    }
    delete r.kickoff;

    r.currObjective = userResults.reduce((prev, rslt) => prev + rslt.data.lObj, 0);

    // ADADELTA
    r.Gradient = userResults.reduce((prev, rslt) => n.add(prev, rslt.data.lGrad), 0);
    r.Eg2 = n.add(n.mul(r.rho, r.Eg2), n.mul(1 - r.rho, n.mul(r.Gradient, r.Gradient)));
    r.deltaW = n.mul(-1, n.mul(n.div(n.sqrt(n.add(r.EdW, r.eps)), n.sqrt(n.add(r.Eg2, r.eps))), r.Gradient)); // eslint-disable-line
    r.EdW = n.add(n.mul(r.rho, r.EdW), n.mul(1 - r.rho, n.mul(r.deltaW, r.deltaW)));
    r.currW = n.add(r.prevW, r.deltaW);

    if (r.currObjective > r.prevObjective) {
      r.complete = true;
      return r;
    }

    // When Gradient is small - converged
    if (n.norm2(r.Gradient) < tol) {
      r.complete = true;
      return r;
    }

    r.prevObjective = r.currObjective;
    r.prevW = r.currW;

    return r;
  },
};
