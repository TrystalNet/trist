const _ = require('lodash')
const {Zones} = require('./constants')
class Rangette {
  constructor(N1, N2) {
    this.focus = null
    this.anchor = null
    this._first = null
    this._last = null
    this._isEmpty = true
    this._hasValue = false
    this._level = 0
    this._isMultiNode = false
    if (!N1) return
    if (!N2) N2 = N1
    this._isEmpty, this._hasValue = true
    this.anchor = N1
    this.focus = N2
    this._first = this.anchor, this._last = this.focus
    if (N1.isAfterSibling(N2)) this._first = N2, this._last = N1
    this._level = this._first ? this._first.rangeLevel(this._last) : 0
    this.isMultiNode = N1 !== N2
  }
  equals(node) {
    if (this.isEmpty && !node) return true
    if (this.isEmpty) return false
    if (this.isMultiNode) return false
    return this.focus === node
  }
  get isEmpty()  { return this._isEmpty }
  set isEmpty(value) { this._isEmpty = value }
  get isMultiNode() { return this._isMultiNode }
  set isMultiNode(value) { this._isMultiNode = value }
  get first() { return this._first }
  set first(value) { this._first = value }
  get last() { return this._last }
  set last(value) { this._last = value }
  get nodes() {
    var nodes = []
    var N = this.first
    while (N) {
      nodes.push(N)
      if (N === this.last) break
      N = N.next
    }
    const lastone = _.last(nodes)
    if (lastone) nodes = nodes.concat(lastone.descendents)
    return nodes
  }
  get vnodes() {
    var N = this.first, vnodes = []
    while (N) {
      vnodes.push(N)
      if (N === this.last) break
      N = N.NV
    }
    return vnodes
  }
  toArray(visiblesOnly = true) {
    var N = this.first, nodes = []
    if (visiblesOnly) {
      while (N) {
        nodes.push(N)
        if (N === this.last) break
        N = N.NV
      }
      return nodes
    }
    var terminal = this.last.NV // might be null, that's ok
    nodes.push(N)
    while (N.next && N.next != terminal) nodes.push(N.next), N = N.next
    return nodes
  }
  zoneOfSibling(node) {
    if (!node) return null
    if (this.isEmpty) return null
    if (this.containsSibling(node)) return Zones.INSIDE
    var N = this.first.PV
    while (N != null) {
      if (N === node) return Zones.ABOVE
      N = N.PV
    }
    N = this.last.NV
    while (N != null) {
      if (N === node) return Zones.BELOW
      N = N.NV
    }
    return null
  }
  containsSibling(node) { return _.includes(this.vnodes, node) }
  contains(node) { return _.includes(this.nodes, node) }
  DUMP() {
    function q(x) { return x ? x.payload : '' }
    return [q(this.anchor), q(this.focus), q(this.first), q(this.last)].join(',')
  }
}
module.exports = Rangette