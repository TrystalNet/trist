/*eslint no-extra-boolean-cast:"off"*/
const _ = require('lodash')
const {NodeStates} = require('./constants')

const walkToEnd = (node, propertyName) => {
  while (node[propertyName]) node = node[propertyName]
  return node
}
const getIsVisible = node => !node.parent
const getIsParent = node => !!node.next && !node.next.PV 
const getParent = node => walkToEnd(node, "PV").prev
const getFirst = node => walkToEnd(node, "prev")
const getLast = node => walkToEnd(node, "next")
const getLevel = node => {
  let level = node.rlevel
  while (node.prev) {
    while (node.PV) {
      node = node.PV
      level += node.rlevel
    }
    if (node.prev) {
      node = node.prev 
      level += node.rlevel
    }
  }
  return level
}
const getCanClose = node => {
  let NV = node.NV
  return (!!NV && NV.level > node.level)
}
const getLastChild = node => {
    const c = node.children
    return c.length > 0 ? c[c.length-1] : null
}
const getLastDescendentOrSelf = node => {
  var nv = node.NV
  if (nv) return nv.prev
  return node.last
}
const getChildren = node => {
  if (!node.next) return []
  if (node.next.PV != null) return []
  let result = []
  let next = node.next
  while (next != null) result.push(next), next = next.NV
  return result
}
const getDescendents = node => {
    var d = [], N = node.next, NV = node.NV
    while (N !== NV) d.push(N), N = N.next
    return d
}
const getVisibleChildren = node => {
  let vc = [], N = node.NV, level = node.level
  while (N && N.level > level) vc.push(N), N = N.NV
  return vc
}
const getVParent = node => {
  let N = node.PV, myLevel = node.level
  while (N != null) {
    if (N.level < myLevel) return N
    N = N.PV
  }
  return null
}
const getState = node => {
  const canClose = getCanClose(node)
  const isParent = getIsParent(node)
  if (canClose && isParent) return NodeStates.BOTH
  if (canClose) return NodeStates.OPEN
  if (isParent) return NodeStates.CLOSED
  return NodeStates.NONE
}
const getIsAfterSibling = (node, n) => {
  if (!n || n === node) return false
  var m = node.PV
  while (m && m != n) m = m.PV
  return !!m
}
const getRangeLevel = (node, terminal) => {
  let N = node, result = node.level
  while (N !== terminal && N.NV) {
    N = N.NV
    if (N && N.level < result) result = N.level
  }
  return result
}
const getToString = (node) => {
    let fn = n => !!n ? n.id : '---'
    let bits = {
      prev: fn(node.prev),
      key: fn(node),
      next: fn(node.next)
    }
    let R = _.values(bits).join(':')
    let level = node.level
    if (level) for (let i = 0; i < level; i++) R = '>' + R
    return R
}
const getToStringV = N => {
  let fn = node => !!node ? node.id : '---'
  let bits = {
    prev: fn(N.PV),
    key: fn(N),
    next: fn(N.NV)
  }
  let R = _.values(bits).join(':')
  let level = N.level
  if (level) for (let i = 0; i < level; i++) R = '>' + R
  return R
}
const getId = node => node.payload.id


class Node {
  constructor(payload) {
    this.payload = payload
    this.rlevel = 0
    this.prev = null
    this.isDirty = false
    this.NV = null
    this.PV = null
    this.prev = null
    this.next = null
  }
  get id() { return getId(this) }
  get level() { return getLevel(this) }
  get state()  { return getState(this) }
  get parent()  { return getParent(this) }
  get isVisible() { return getIsVisible(this) }
  get first() { return getFirst(this) }
  get last() { return getLast(this) }
  get vparent() { return getVParent(this) }
  get canClose() { return getCanClose(this) }
  get lastChild() { return getLastChild(this) }
  get lastDescendentOrSelf()  { return getLastDescendentOrSelf(this) }
  get children() { return getChildren(this) }
  get descendents() { return getDescendents(this) }
  get visibleChildren() { return getVisibleChildren(this) }
  get isParent() { return getIsParent(this) }
  isAfterSibling(n) { return getIsAfterSibling(this, n) }
  rangeLevel(terminal) { return getRangeLevel(this, terminal) }
  toString() { return getToString(this) }
  toStringV() { return getToStringV(this) }
}

module.exports = Node
