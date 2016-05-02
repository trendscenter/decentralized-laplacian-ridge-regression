'use strict'
var utils = require('./utils')
var jStat = require('jstat').jStat

/**
 * Convert Laplace CDF scale to exponential CDF rate (lambda)
 * @param  {number} scale the Laplace CDF scale
 * @return {number}       the exponential CDF rate (lamdba)
 */
function scaleToRate (scale) {
  scale = scale || 1
  return 1 / scale
}

/**
 * Convert a Laplace CDF probability to an Exponential CDF probability
 * @param  {number} probability the Laplace probability (between 0, 1)
 * @return {number}             the Exponential probability (between 0, 1)
 */
function convertProbability (probability) {
  var errorMsg
  if (probability <= 0 || probability >= 1) {
    errorMsg = [
      'probability must be in range [0,1]: `',
      probability,
      '` given'
    ].join('')
    throw new Error(errorMsg)
  }

  return Math.abs(1 - (2 * probability))
}

/**
 * convert Exponential CDF value (x) to Laplace CDF value
 * @param  {number} expX        the exponential CDF value
 * @param  {number} probability the laplace probability of the CDF value
 * @param  {number} mean        the mean of the Laplace CDF
 * @return {number}             The Laplace CDF value
 */
function convertDistrubution (expX, probability, mean) {
  mean = mean || 0
  return expX * utils.sign(probability - 0.5) + mean
}

/**
 * calculate the inverse Laplace CDN at the given location
 * @param  {number} probability a number between 0 and 1
 * @param  {number} scale of the CDN (defaults to 1)
 * @param  {number} mean of the CDN (default to 0)
 * @return {number}   The inverse transform of the CDN at location
 */
function inverseCdf (probability, scale, mean) {
  var rate = scaleToRate(scale)
  var expProbability = convertProbability(probability)
  var expX = jStat.exponential.inv(expProbability, rate)
  return convertDistrubution(expX, probability, mean)
}

/**
 * sample from the Laplace inverse CDN
 * @param  {number} scale the scale of the CDN (defaults to 1)
 * @param  {number} mean  the mean of the CDN (defaults to 0)
 * @return {number}       random sample from Laplace CDN
 */
function sampleInverseCdf (scale, mean) {
  var probability = Math.random()
  return inverseCdf(probability, scale, mean)
}

/**
 * calculate random Laplace noise. Assumes CDN has a mean of 0
 * @param  {number} scale the scale of the CDN (defaults to 1)
 * @return {number}       the noise
 */
function noise (scale) {
  return sampleInverseCdf(scale)
}

module.exports = {
  inverse: inverseCdf,
  sampleInverse: sampleInverseCdf,
  noise: noise
}
