const NodeStates = { 
  NONE   :1, 
  OPEN   :2, 
  CLOSED :3, 
  BOTH   :4 
}

const Zones = { 
  INSIDE :1,
  ABOVE  :2,
  BELOW  :3 
}

const Opcodes = { 
  CloseOne :1, 
  Close    :2,
  Add      :3,
  Split    :4,
  Paste    :5,
  Insert   :6,
  Indent   :7,
  MoveDown :8,
  MoveUp   :9, 
  Join     :10, 
  Delete   :11, 
  OpenOne  :12, 
  Open     :13, 
  Cut      :14 
}

module.exports = {
  NodeStates, Zones, Opcodes
}
