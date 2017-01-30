'use strict';

const FreeSurfer = require('freesurfer-parser');
const pkg = require('../package.json');
const localRunner = require('./local');
const remoteRunner = require('./remote');
const DEFAULT_MAX_ITERATIONS = require('./constants').DEFAULT_MAX_ITERATIONS;

module.exports = {
  name: pkg.name,
  version: pkg.version,
  plugins: ['group-step', 'inputs'],
  local: [{
    type: 'function',
    fn: localRunner.preprocess,
    verbose: true,
    inputs: [{
      help: 'Select Freesurfer region(s) of interest',
      label: 'Freesurfer ROI',
      type: 'select',
      values: FreeSurfer.validFields,
    }, {
      defaultValue: DEFAULT_MAX_ITERATIONS,
      label: 'Iteration count',
      type: 'number',
    }, {
      defaultValue: [{
        name: 'Is Control?',
        type: 'boolean',
      }],
      label: 'Covariates',
      /**
       * @todo Determine a better `type` for this input. Something like
       * "data-map" or "covariate-map" or…something.
       */
      type: 'covariates',
    }],
  }, {
    type: 'function',
    fn: localRunner.run,
    verbose: true,
  }],
  remote: {
    type: 'function',
    fn: remoteRunner.run,
    verbose: true,
  },
};

