'use strict';
const n = require('numeric');

module.exports = {
  defaultLambda: 0.0,

    /**
     * Compute regression error for a set of samples (objective)
     * @note See [Eqn 6]
     * @param  {array}  w   (aka betas or coefficients): array of betas to
     *                          correspond to each xVal.
     * @param  {array}  xVals   2D array where each sub-array contains all xVals
     *                          for a single sample in the same order as
     *                          initialMVals
     * @param  {array}  yVals   array of y values for each sample in xVals
     * @param  {number} lambda
     * @return {number} error score
     */
  objective(w, xVals, yVals, lambda) {
    lambda = lambda || this.defaultLambda;
    return n.sum(n.pow(n.sub(yVals, n.dot(xVals, w)), 2)) + (lambda * n.dot(w, w) / 2);
  },

  /**
   * Compute the local gradient of the object function
   * @note See [Eqn 9]
   * @param  {array}  w   (aka betas or coefficients): array of betas to
   *                          correspond to each xVal.
   * @param  {array}  xVals   2D array where each sub-array contains all xVals
   *                          for a single sample in the same order as
   *                          initialMVals
   * @param  {array}  yVals   array of y values for each sample in xVals
   * @param  {number} lambda
   * @return {array}  gradient values for each mVal
   */
  gradient(w, X, y, lambda) {     
    lambda = lambda || this.defaultLambda;
    return n.add(
      n.mul(
        -2,
        n.dot(n.transpose(X), n.sub(y, n.dot(X, w)))
      ),
      n.mul(lambda, w)
    );
  },

    /**
     * minimize a set of regressors against the objective function and
     * response set
     * @param  {array} initialMVals initial regressor values
     * @param  {array} xVals    2D array where each sub-array contains all xVals
     *                          for a single sample in the same order as
     *                          initialMVals
     * @param  {array}  yVals   array of y values for each sample in xVals
     * @return {array}  w in same order as initialMVals
     */
  oneShot(initialMVals, xVals, yVals) {
    return n.uncmin((w) => this.objective(w, xVals, yVals), initialMVals).solution;
  },

  /**
   * calculate new w based on previous w, gradients and a learningRate
   * @param  {number} learningRate    the rate applied to the gradient
   * @param  {array} w            the previous w which gradients were
   *                                  calculated from
   * @param  {array} gradients        the gradients calculated from the w
   * @return {array}                  the new w (betas)
   */
  recalculateMVals(learningRate, w, gradients) {
    return n.sub(w, n.dot(learningRate, gradients));
  },

  /**
   * Apply w (aka coefficients or betas) to x values, then sum results
   * eg `y = m1 * x1 + m2 * x2...`
   * @param  {array} w array of coefficents (betas)
   * @param  {array} xVals       array of x values
   * @return {number}             result (y value);
   */
  applyModel(w, xVals) {
    return n.dot(xVals, w);
  },

};
