const _ = require('lodash')
const {Zones} = require('./constants')

class Range {
  constructor(trist) {
    this.focus = null
    this.anchor = null
    this._first = null
    this._last = null
    this._LV = null
    this._isEmpty = true
    this._hasValue = false
    this._level = 0
    this._count  = 0
    this._isMultinode = false
    function visibleParentOrSelf(N)  {
      if(!N) return null
      while(N.parent) N = N.parent
      return N
    }
    function countem(first, last) {
      if(!first) return 0
      var N = first, C = 1
      while(N != last) C++, N = N.next
      while(N.next && !N.next.isVisible) C++, N = N.next
      return C
    }
    if (!trist.isFocused) return
    this.isEmpty = false, this.hasValue = true
    this.focus = trist.focus
    this.anchor = trist.anchor
    this._first = this.anchor, this._last = this.focus
    if(this.anchor.isAfterSibling(this.focus))
        this._first = this.focus, this._last = this.anchor
    this._level = this.first ? this.first.rangeLevel(this.last) : 0
    this._isMultinode = this.focus !== this.anchor
    this._LV = visibleParentOrSelf(this.last)
    this._count = countem(this.first, this.last)
  }
  //-------------
  get count() { return this._count }
  set count(value) { this._count = value }
  get level() { return this._level }
  set level(value) { this._level = value }
  get isEmpty()  { return this._isEmpty }
  set isEmpty(value) { this._isEmpty = value }
  get hasValue()  { return this._hasValue }
  set hasValue(value) { this._hasValue = value }
  get isMultinode()  { return this._isMultinode }
  set isMultinode(value) { this._isMultinode = value }
  get first() { return this._first }
  set first(value) { this._first = value }
  get last() { return this._last }
  set last(value) { this._last = value }
  //-------------
  get nodes() {
    var nodes = []
    var N = this.first
    while (N) {
      nodes.push(N)
      if (N === this.last) break
      N = N.next
    }
    var lastone = _.last(nodes)
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
  equals(node) {
    if (this.isEmpty && !node) return true
    if (this.isEmpty) return false
    if (this.isMultinode) return false
    return this.focus === node
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
module.exports = Range