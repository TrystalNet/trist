const NodeAction = require('../node-action')
const node = require('../trist-node')
//console.log(node)

// node/redo/undo
// n,p,nv,pv,l

const toNode = s => {
  const t = s.split(',')
  const n = {}
  const addIt = (i, s) => t[i] && (n[s] = t[i])
  addIt(0,'next')
  addIt(1,'prev')
  addIt(2,'NV')
  addIt(3,'PV')
  addIt(4,'rlevel')
  return n
}

const toTestNode = (nodespec, redospec, undospec) => {
  const na = new NodeAction(toNode(nodespec))
  if(redospec) na.redo = toNode(redospec)
  if(undospec) na.undo = toNode(undospec)
  return na
}

test('Check that next works for a node when redo is undefined', () => expect(toTestNode('X').next).toBe('X'))
test('Ensure that redo value is return ahead of node value', () => expect(toTestNode('X','Y').next).toBe('Y'))