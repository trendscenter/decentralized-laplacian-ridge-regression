'use strict'

const comp = require('../')
const local = require('../src/local')
const test = require('tape')

test('addBias', (t) => {
  const r = local.addBias([[1, 2, 3], [4, 5, 6]])
  t.deepEquals(r, [[1, 2, 3, 1], [4, 5, 6, 1]], 'bias adds')
  t.end()
})
