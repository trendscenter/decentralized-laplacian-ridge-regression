'use strict';

module.exports = {
  DECLARATION_INPUTS_KEY: '__DECLARATION_INPUTS_KEY__',
  DEFAULT_MAX_ITERATIONS: 250,

  /**
   * Run step key.
   *
   * @todo This key is added to result objects to track the local step. This
   * complexity should exist in coinstac-common's `Pipeline`, but this is a
   * temporary workaround.
   *
   * @const {string}
   */
  RUN_STEP_KEY: '__RUN_STEP_KEY__',
};

