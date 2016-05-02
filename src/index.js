'use strict'

const pkg = require('../package.json')
const values = require('lodash/values')
const localRunner = require('./local')
const remoteRunner = require('./remote')
const get = require('lodash/get')

module.exports = {
  name: pkg.name,
  version: pkg.version,
  local: {
    type: 'function',
    fn(opts, cb) {
      const serverKickoff = get(opts, 'remoteResult.data.kickoff')
      const groupStep = get(opts, 'remoteResult.data.step') || 1
      const userStep = opts.step = get(opts, 'previousData.step') || 0
      if (userStep === groupStep) {
        return cb()
      } else if (!userStep && serverKickoff) {
        return cb(null, { step: 0 })
      }
      localRunner.run(opts, (err, data) => {
        if (err) { return cb(err) }
        data.step = data.kickoff ? 0 : (data.step || 0) + 1
        if (data) console.log(data)
        cb(null, data)
      })
    },
    verbose: true,
  },
  remote: {
    type: 'function',
    fn(opts, cb) {
      remoteRunner.run(opts, (err, data) => {
        if (err) { return cb(err) }
        if (data) console.log(data)
        cb(null, data)
      })
    },
    verbose: true,
  },
}
