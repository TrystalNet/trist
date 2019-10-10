const Trist = require('../trist')

const NEWTRIST = () => new Trist();
const TRIST_A = () => NEWTRIST().add({id:'A'})
const TRIST_AoB = () => TRIST_A().add({id:"B"},1)

// In dumps, * means a node is both beginning and end of range
// ! means the trist is dirty

test('closing the first node', () => {
  const trist = TRIST_AoB()
  trist.setRange(trist._head)
  trist.closeOne(trist._head)
  expect(trist.canCollapse).toBeFalsy()
})

test('undo closing the first node', () => {
  const trist = TRIST_AoB()
  trist.setRange(trist._head)
  trist.closeOne(trist._head)
  trist.undo()
  expect(trist.canCollapse).toBeTruthy()
})

let T = NEWTRIST()
test('add a node to an empty trist', ()=> {
  T = T.add({id:'A'})
  expect(T.DUMP('id')).toBe("A*!")
})

test('add a node to a single-node trist', ()=> {
  T = T.add({id:'B'})
  expect(T.DUMP('id')).toBe("A,B*!")
})

test('appends a  child node to a two-node trist', ()=> {
  T = T.add({id:'C'},1)
  expect(T.DUMP('id')).toBe("A,B,.C*!")
})

test('focusing the first node', () => {
  T.setRange(T._head)
  expect(T.DUMP('id')).toBe("A*,B,.C!")
  expect(T.canCollapse).toBeFalsy()
})

