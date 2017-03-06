'use strict';

const path = require('path');
const remote = require('../src/remote');

// remove randomness from simulation
remote.defaultW = [0.1, 0.1];

module.exports = {
  /**
   * This property is used to pass computation input values from the
   * declaration into the computation.
   *
   * @todo Don't require `covariates` computation input
   *
   * {@link https://github.com/MRN-Code/coinstac/issues/161}
   */
  __ACTIVE_COMPUTATION_INPUTS__: [[
    ['TotalGrayVol'], // FreeSurfer region of interest
    20, // Max iteration count
    0, // Lambda
    [{
      name: 'Is Control',
      type: 'boolean',
    }, {
      name: 'Age',
      type: 'number',
    }],
  ]],
  computationPath: '../src/index.js',
  local: [{
    metaFilePath: path.join(__dirname, 'demo/metadata-1.csv'),
    metaCovariateMapping: {
      1: 0,
      2: 1,
    },
  }, {
    metaFilePath: path.join(__dirname, 'demo/metadata-2.csv'),
    metaCovariateMapping: {
      1: 0,
      2: 1,
    },
  }],
  verbose: true,
};

