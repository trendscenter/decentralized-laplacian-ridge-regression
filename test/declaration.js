'use strict';

const DECLARATION_INPUTS_KEY = require('../src/constants').DECLARATION_INPUTS_KEY;
const path = require('path');
const remote = require('../src/remote');
/**
 * Stub in a ROI. Used in place of `pluginState` inputs for testing.
 *
 * @todo Expose plugin state hooks for simulator declaration files.
 */
const inputs = [[['TotalGrayVol']]];

// remove randomness from simulation
remote.defaultW = [0.1, 0.1];

module.exports = {
  computationPath: '../src/index.js',
  local: [{
    files: [
      // controls
      {
        filename: path.resolve(__dirname, 'demo/controls/M00000001.txt'),
        tags: { isControl: true },
      },
      {
        filename: path.resolve(__dirname, 'demo/controls/M00000002.txt'),
        tags: { isControl: true },
      },
      {
        filename: path.resolve(__dirname, 'demo/controls/M00000003.txt'),
        tags: { isControl: true },
      },
      {
        filename: path.resolve(__dirname, 'demo/controls/M00000004.txt'),
        tags: { isControl: true },
      },
      {
        filename: path.resolve(__dirname, 'demo/controls/M00000005.txt'),
        tags: { isControl: true },
      },

      // substance users
      {
        filename: path.resolve(__dirname, 'demo/substanceUsers/M00000011.txt'),
        tags: { isControl: false },
      },
      {
        filename: path.resolve(__dirname, 'demo/substanceUsers/M00000012.txt'),
        tags: { isControl: false },
      },
      {
        filename: path.resolve(__dirname, 'demo/substanceUsers/M00000013.txt'),
        tags: { isControl: false },
      },
      {
        filename: path.resolve(__dirname, 'demo/substanceUsers/M00000014.txt'),
        tags: { isControl: false },
      },
      {
        filename: path.resolve(__dirname, 'demo/substanceUsers/M00000015.txt'),
        tags: { isControl: false },
      },
    ],
    [DECLARATION_INPUTS_KEY]: inputs,
  }, {
    files: [
      // controls
      {
        filename: path.resolve(__dirname, 'demo/controls/M00000006.txt'),
        tags: { isControl: true },
      },
      {
        filename: path.resolve(__dirname, 'demo/controls/M00000007.txt'),
        tags: { isControl: true },
      },
      {
        filename: path.resolve(__dirname, 'demo/controls/M00000008.txt'),
        tags: { isControl: true },
      },
      {
        filename: path.resolve(__dirname, 'demo/controls/M00000009.txt'),
        tags: { isControl: true },
      },
      {
        filename: path.resolve(__dirname, 'demo/controls/M00000010.txt'),
        tags: { isControl: true },
      },

      // substance users
      {
        filename: path.resolve(__dirname, 'demo/substanceUsers/M00000016.txt'),
        tags: { isControl: false },
      },
      {
        filename: path.resolve(__dirname, 'demo/substanceUsers/M00000017.txt'),
        tags: { isControl: false },
      },
      {
        filename: path.resolve(__dirname, 'demo/substanceUsers/M00000018.txt'),
        tags: { isControl: false },
      },
      {
        filename: path.resolve(__dirname, 'demo/substanceUsers/M00000019.txt'),
        tags: { isControl: false },
      },
      {
        filename: path.resolve(__dirname, 'demo/substanceUsers/M00000020.txt'),
        tags: { isControl: false },
      },
    ],
    [DECLARATION_INPUTS_KEY]: inputs,
  }],
  verbose: true,
};

