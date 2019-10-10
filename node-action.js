const ifUndef = (a,b) => typeof(a) === 'undefined' ? b : a
const nodeProp = (na, prop) => ifUndef(na.redo[prop], na.node[prop])

class NodeAction {
  constructor(node) {
    this.node = node
    this.redo = {}
    this.undo = {}
  }
  get next()   { return nodeProp(this, 'next') }
  get prev()   { return nodeProp(this, 'prev')   }
  get PV()     { return nodeProp(this, 'PV') }
  get NV()     { return nodeProp(this, 'NV') }
  get rlevel() { return nodeProp(this, 'rlevel') }
}

module.exports = NodeAction