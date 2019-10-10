const NodeStates = require('../constants').NodeStates
const UNIQISH = require('@trystal/uniq-ish')
const UndoManager = require('@trystal/undo')

test('test any constant', () => expect(NodeStates.BOTH).toBe(4))

test('test uniq-ish to be something', () => expect(UNIQISH.randomId(4)).toBeTruthy())

test('test that undo manager is viable', () => {
  const um = new UndoManager()
  expect(um.hasUndo()).toBe(false)
})


