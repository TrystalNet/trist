const _           = require('lodash')
const {randomId} = require('@trystal/uniq-ish')
const UndoManager = require('@trystal/undo')
const Action      = require('./action')
const Node        = require('./trist-node')
const Range       = require('./range')
const {Opcodes, Zones} = require('./constants')

const calcLevel = X => {
  let level = X.rlevel
  let minlevel = level
  while (X.NV) {
    level += X.NV.rlevel
    if (minlevel > level) minlevel = level
    X = X.NV
  }
  return minlevel
}
const normalize = X => { X.rlevel -= calcLevel(X) }
//function tristToText(trist) { }

class Trist {
  constructor() {
    this._log = []
    this._head = null
    this.focus = null
    this.anchor = null
    this._isDirty = false
    this.nodes = []
    this.onVisibsAdded = []
    this.observer = []
    this.ME = this
    this.undoManager = new UndoManager()
  }
  // -----------------
  get nextId() {
    return randomId(4, id => !this.getById(id))
  }
  get isDirty() { return this._isDirty }
  set isDirty(value) {
    if (value === this._isDirty) return
    this._isDirty = value
  }
  get first() { return this._head || null }
  set first(value) { this._head = value }
  // -----------------
  get last() { return this.isEmpty ? null : this._head.last }
  get lastVisible() { let N = this.first; while (N && N.NV) N = N.NV; return (N) }
  get nextVisible() { let range = this.range(); return range.isEmpty ? this.first : range.focus.NV }
  get prevVisible() { let range = this.range(); return range.isEmpty ? this.lastVisible : range.focus.PV }
  get length() { let i = 0, n = this._head; while (n != null) { i++ , n = n.next } return i }
  get isEmpty() { return !this._head }
  get isFocused() { return !!this.focus }
  // -----------------
  // toJson() {
  //   let parentIndex :  any = {}
  //   let ja = _.map(this.toArray(), (N, i) => {
  //     let payload = N.payload
  //     let jo  = payload.Pack()
  //     let level = N.level
  //     if(level) jo.L = N.level
  //     let parent = N.parent
  //     if (parent) jo.P = parentIndex[parent.payload.id]
  //     parentIndex[payload.id] = i
  //     return jo
  //   })
  //   let jo  = {}
  //   jo.Title = ''
  //   jo.Lines = ja
  //   return jo
  // }

  collapseAll() {
    // WARNING ****** ONLY INTENDED TO BE USED BY GENERATED TRYSTS ON STARTUP ******** UNDO NOT THOUGHT THROUGH HERE
    this.setRange(null)
    const allofem = this.toArray(true)
    allofem.reverse()
    allofem.forEach((node) => this.close(node))
    this.setRange(null)
  }

  debugStr(vonly = true) {
    const F = G => G ? G.id() : '----'
    return _(this.toArray(vonly)).map(function (x) { return `${x.rlevel}:${x.id}.${F(x.NV)}-${x.payload.toText()}` }).value()
  }

  toText() {
    const self = this
    if (this.isEmpty) return ''
    return _.map(self.toArray(), (hug) => {
      const payload = hug.payload
      return Array(hug.level + 1).join('    ') + (payload.toText ? payload.toText() : payload.toString())
    }).join('\r\n')
  }
  isValid() {
    let N = this.first
    let LVL = 0
    while (N) {
      LVL += N.rlevel
      if (LVL < 0) return false
      N = N.NV
    }
    return true
  }
  getById(id) {
    let N = this.first
    while (N != null) {
      if (N.id === id) return N
      N = N.next
    }
    return null
  }
  isFocus(n) { return this.focus === n }
  isSelected(n) {
    const range = this.range()
    let {first: N} = range
    while (N) {
      if (N === n) return true
      if (N === range.last) break
      N = N.NV
    }
    return false
  }
  // ----------------
  addObserver(obs) {
    if (this.observers.indexOf(obs) >= 0) return
    this.observers.push(obs)
  }
  removeObserver(obs) {
    const i = this.observers.indexOf(obs)
    if (i < 0) return
    this.observers.splice(i, 1)
  }
  onInvalidated() {
    _.each(this.observers, O => { if (O.invalidated) O.invalidated() })
  }
  unTouch() {
    const arr = this.toArray()
    for (let i = 0; i < arr.length; i++) arr[i].isDirty = false
    this.isDirty = false
    return this
  }
  touch() {
    this.isDirty = true
    return this
  }
  toArray(visiblesOnly = false) {
    const result = []
    let N = this._head
    if (visiblesOnly) while (N) result.push(N), N = N.NV
    else while (N) result.push(N), N = N.next
    return result
  }
  _setRange(anchor, focus) {
    const ME = this
    function ensureNodesAreVisible() {
      if (!anchor) return
      const nodesToReveal = []
      if (!anchor.isVisible) nodesToReveal.push(anchor)
      if (focus !== anchor && !focus.isVisible) nodesToReveal.push(focus)
      if (nodesToReveal.length > 0) ME.ensureVisible(nodesToReveal)
    }
    if (!focus) focus = anchor
    ensureNodesAreVisible()
    this.anchor = anchor
    this.focus = focus
    this.onInvalidated()
    return this
  }
  _get(payload) {
    let N = this._head
    while (N != null && N.payload !== payload) N = N.next
    return N
  }
  range() {
    try {
      return new Range(this)
    }
    catch (err) {
      console.log(err)
      // console.log(this.DUMP())
      console.log(this.DUMPLOG())
      throw err
    }
  }
  clone(payloadCloner = null) {
    if (this.isEmpty) return new Trist()
    const originals = this.toArray()
    const clones = _.map(originals, node => {
      const payload = payloadCloner ? payloadCloner(this, node.payload) : node.payload
      const copy = new Node(payload)
      copy.rlevel = node.rlevel
      return copy
    })
    _.each(clones, (copy, index) => {
      function cloneHugAttr(attr) {
        let hug = originals[index][attr]
        if (!hug) return
        let j = originals.indexOf(hug)
        if (j >= 0) copy[attr] = clones[j]
      }
      cloneHugAttr('PV')
      cloneHugAttr('NV')
      if (index > 0) copy.prev = clones[index - 1] // populate prev
      if (index < clones.length - 1) copy.next = clones[index + 1] // populate next
    })
    const clip = new Trist()
    clip.nodes = clones
    clip._head = clones[0]
    return clip
  }
  /**
  * Make a copy of the selected range.
  * @param payloadCloner The method for cloning the payload; if not provided, will simply copy the payload as is.
  */
  copy() {
    if (!this.canCopy) return new Trist()
    const range = this.range()
    const originals = this.range().nodes
    const anchorLevel = range.first.level - range.level
    const hugClones = _.map(originals, node => {
      const copy = new Node(node.payload)
      copy.rlevel = node.rlevel
      return copy
    })
    hugClones[0].rlevel = anchorLevel
    _.each(hugClones, function (copy, index) {
      function cloneHugAttr(attr) {
        const hug = originals[index][attr]
        if (!hug) return
        const j = originals.indexOf(hug)
        if (j >= 0) copy[attr] = hugClones[j]
      }
      cloneHugAttr('PV')
      cloneHugAttr('NV')
      if (index > 0) copy.prev = hugClones[index - 1]
      if (index < hugClones.length - 1) copy.next = hugClones[index + 1]
    })
    const clip = new Trist()
    clip.nodes = hugClones
    clip._head = hugClones[0]
    return clip
  }
  cut() {
    this.log('CUT')
    if (!this.canDelete) return this

    const range = this.range()
    const originals = this.range().nodes
    const anchorLevel = range.first.level - range.level
    const hugClones = _.map(originals, node => {
      const copy = new Node(node.payload)
      copy.rlevel = node.rlevel
      return copy
    })
    hugClones[0].rlevel = anchorLevel
    _.each(hugClones, function (copy, index) {
      const cloneHugAttr = attr => {
        const node = originals[index][attr]
        if (!node) return
        const j = originals.indexOf(node)
        if (j >= 0) copy[attr] = hugClones[j]
      }
      cloneHugAttr('PV')
      cloneHugAttr('NV')
      if (index > 0) copy.prev = hugClones[index - 1]
      if (index < hugClones.length - 1) copy.next = hugClones[index + 1]
    })
    const clip = new Trist()
    clip.nodes = hugClones
    clip._head = hugClones[0]
    const action = this.buildRemoveAction(this.range(), Opcodes.Cut)
    action.redo()
    this.undoManager.add(action)
    return clip
  }

  findPayload(o) { return _.findWhere(this.toArray(), { payload: o }) }

  find(fn, fromStart = false, searchUp = false) {
    let elements = this.toArray()
    if (searchUp) elements.reverse()
    if (!fromStart) {
      const focus = this.focus
      if (focus && true) {
        const focusIndex = _.indexOf(elements, focus)
        elements = elements.slice(focusIndex + 1)
      }
    }
    return _.find(elements, fn)
  }
  setRange(anchor, focus) { return this._setRange(anchor, focus) }
  setRangeByPayload(a, f) {
    const A = this.findPayload(a)
    if (f) this._setRange(A, this.findPayload(f))
    else this._setRange(A)
    return this
  }
  canCollapseSomething(node) {
    if (!node) return false
    const NV = node.NV
    return NV && NV.level > node.level
  }
  canIndentN(n) {
    const range = this.range()
    if (range.isEmpty) return false
    return n > 0 || range.level > 0
  }
  canMoveSomethingDown(node) {
    if (!node) return this.canMoveDown
    const range = this.range()
    if (range.isEmpty) return false
    if (!node) return !!range.last.NV
    if (range.containsSibling(node)) return false
    return true
  }
  canMoveSelection(node, levels = 0) {
    if (!_.isInteger(levels)) throw `Invalid level (${levels}) passed to trist.canMoveSelection(...).`
    const range = this.range()
    if (range.isEmpty) return false
    if (!node) node = range.first
    if (range.containsSibling(node)) {
      if (levels < 0 && range.level === 0) return false
      return true
    }
    return true
  }
  canMoveSomethingUp(node) {
    if (node && true) return this.canMoveUp
    const range = this.range()
    if (range.isEmpty) return false
    return (range.zoneOfSibling(node) !== Zones.INSIDE)
  }
  canExpandSomething(nodeOrArray) {
    if (!nodeOrArray) return this.canExpand
    if (nodeOrArray instanceof Node) return nodeOrArray.isParent
    if (nodeOrArray instanceof Array) return _.any(nodeOrArray, n => n.isParent)
    return false
  }
  ancestorsOf(node) {
    if (!node) return null
    const ancestors = []
    node = node.parent
    while (node) {
      ancestors
      node = node.parent
    }
    return ancestors
  }
  get canExpand() {
    const range = this.range()
    if (range.isEmpty) return false
    if (!range.isMultinode) return range.focus.isParent
    let N = range.first
    while (N !== range.last) {
      if (N.isParent) return true
      N = N.NV
    }
    return false
  }
  get canCopy() { return this.isFocused }
  get canNavParent() {
    if (this.isEmpty) return false
    const range = this.range()
    if (range.isEmpty) return true
    return !!range.focus.vparent
  }
  get canUp() {
    if (this.isEmpty) return false
    const range = this.range()
    if (range.isEmpty) return true
    return !!range.focus.PV
  }
  get canDown() {
    if (this.isEmpty) return false
    const range = this.range()
    if (range.isEmpty) return true
    return !!range.focus.NV
  }
  get canUndo() { return this.undoManager.hasUndo() }
  get canRedo() { return this.undoManager.hasRedo() }
  get canAdd() { return true }
  get canCollapse() {
    const range = this.range()
    if (range.isEmpty) return false
    if (!range.isMultinode) {
      const NV = range.focus.NV
      return NV && NV.level > range.focus.level
    }

    // 1 P              range.first  LVL = 0  
    // 2   V---         -- this will be collapsed
    // 3       NV--     
    // 4   ----
    // 5   ----         range.last

    // might be doing more work here than we need to
    const P = range.first
    let V = P.NV
    let LVL = P.level
    while (V) {
      const NV = V.NV
      const collapseThisInstead = (V !== range.last) && NV && (NV.level > V.level)  //collapsing NV takes precedence
      if (V.level > LVL && !collapseThisInstead) return true
      if (V == range.last) break
      LVL = V.level
      V = NV
    }
    return false
  }
  get canExtendDown() { return this.isFocused && !!this.focus.NV }
  get canExtendUp() { return this.isFocused && !!this.focus.prev }
  get canInsert() { return true }
  get canMoveDown() {
    const range = this.range()
    return range.isEmpty ? false : !!range.last.NV
  }
  get canMoveUp() {
    const range = this.range()
    if (range.isEmpty) return false
    return !!range.first.prev
  }
  get canDelete() { return !this.range().isEmpty }
  get canJoin() {
    const focus = this.focus
    if (focus.isParent) return false
    if (!focus.NV) return false
    return true
  }

  ensureVisibleWork(line) {
    const ancestors = this.ancestorsOf(line)
    const revealed = []
    ancestors.forEach(function (ancestor) {
      const I = revealed.indexOf(ancestor)
      let p = [I + 1, 0]
      p = p.concat(ancestor.children)
      revealed.splice.apply(revealed, p)
    })
    return revealed
  }

  ensureVisible(nodeOrArray) {
    if (nodeOrArray instanceof Node) {
      const node = nodeOrArray
      const parents = []
      let parent = node.parent
      while (parent) {
        parents.unshift(parent)
        parent = parent.parent
      }
      this.open(parents)  // we have an operation that 'opens' a set of parent nodes; reasonable
      return this
    }
    const parents1 = _.map(nodeOrArray, (N) => {
      const P = []
      let P1 = N.parent
      while (P1) {
        P.unshift(P1)
        P1 = P1.parent
      }
      return P
    })
    // for each item we are ensuring, we now have an array of parents
    this.open(_.union(_.flatten(parents1)))
    return this
  }
  home() { return this._setRange(this._head) }
  focusFirst() { return this.home() }
  focusLast() { return this._setRange(this.lastVisible) }
  navParent() {
    if (!this.canNavParent) return this
    return this._setRange(this.focus.vparent)
  }
  up() {
    if (!this.canUp) return this
    return this._setRange(this.isFocused ? this.focus.PV : this.lastVisible)
  }

  left() {
    const focus = this.focus
    if (!focus) return this
    else if (focus.canClose) this.close(focus)
    else if (focus.vparent) this._setRange(focus.vparent)
    else this.up()
    return this
  }

  right() {
    if (this.canExpand) this.open(); else this.down()
    return this
  }
  down() {
    if (!this.canDown) return this
    const N = this.isFocused ? this.focus.NV : this.first
    return this._setRange(N)
  }
  blur() {
    this._setRange(null); return this
  }
  extendDown() {
    if (!this.canExtendDown) return trist
    const trist = this, range = trist.range()
    return this._setRange(range.anchor, range.focus.NV)
  }
  extendUp() {
    if (!this.canExtendUp) return this
    const trist = this, range = trist.range()
    return this._setRange(range.anchor, range.focus.PV), this
  }

  closeOne(nodeToClose) {
    if (!this.canCollapseSomething(nodeToClose)) return this
    // let range = this.range()
    // let undoFocus = range.focus
    // let redoFocus = range.focus
    const A = nodeToClose
    const C = A.lastChild
    const D = A.NV                // must exist, or collapse is not possible
    const E = _.last(A.visibleChildren) // must exist, for the same reason
    const F = E.NV

    // OPEN:  100 .101
    // A = 100
    // C = ~
    // D = 101
    // E = 101
    // F = ~

    // before:  A( ~ :100:101)    B(100:101: ~ )
    // after:   A( ~ :100: ~ )    B( ~ :101: ~ )

    const action = new Action(this, Opcodes.CloseOne)
    action.linkVisibles(A, F)
    if (F) action.addRLevel(F, F.level - A.level)
    action.linkVisibles(C, D)
    if (C && D) action.addRLevel(D, D.level - C.level)
    action.addNV(E, null) // chaining visibles doesn't work here because of the possibility of a 'BOTH' parent
    if (!this.isDirty) action.tristAction.redo.isDirty = false // the only time when we don't want to automatically set the dirty flag
    action.buildUndo()
    action.redo()
    this.undoManager.add(action)
    return this
  }
  close(node) {
    const trist = this
    const range = trist.range()
    if (node) return this.closeOne(node)
    if (!this.canCollapse) return this
    if (!range.isMultinode) return this.closeOne(this.focus)
    // so the close operation is acting on a multi hug range
    // how is this different from single node case?
    //
    // I believe we have engineered this to be a gradual close -- one level at a time
    const rangeVisibles = range.vnodes
    const potentialParents = _.filter(rangeVisibles, rv => rv.NV && rv.NV.level > rv.level)
    const targetLevel = _.maxBy(potentialParents, (PP) => PP.level).level
    const workParents = _.filter(potentialParents, pp => pp.level === targetLevel)

    const action = new Action(trist, Opcodes.Close)
    _.each(workParents, function (nodeToClose) {
      const A = nodeToClose
      const C = A.lastChild
      const D = A.NV                // must exist, or collapse is not possible
      const VC = A.visibleChildren
      const E = _.last(VC) // must exist, for the same reason
      if (_.includes(VC, range.focus)) action.setRange(range.anchor, A)
      else if (_.includes(VC, range.anchor)) action.setRange(A, range.focus)
      const F = E.NV

      action.linkVisibles(A, F)
      if (F) action.addRLevel(F, F.level - A.level)
      action.linkVisibles(C, D)  // do we really want to do this?  /// NEED TO TEST THIS
      action.addNV(E, null)
    })

    if (!trist.isDirty) action.tristAction.redo.isDirty = false // the only time when we don't want to automatically set the dirty flag
    // how do know where to set the range to?
    // since we only close one level at a time, the focus / range will only have to move up one level
    // but how do we know if we're going to encounter it in advance?
    // the endpoints of the range are known to be either focus or range
    // not sure how that helps us yet

    action.redo()
    trist.undoManager.add(action)
    return this
  }
  undo(n) {
    if (!this.canUndo) return this
    n = n || 1
    _.each(_.range(n), () => this.undoManager.undo())
    return this
  }
  redo(n) {
    if (!this.canRedo) return this
    n = n || 1
    _.each(_.range(n), () => this.undoManager.redo())
    return this
  }
  /**
  * Add a new node at the specified level.
  * Level is absolute, but is converted to a relative value internally.
  */
  add(payload, level = 0) {
    if (!_.isInteger(level)) throw `Invalid level (${level}) passed to trist.add(...).`
    // N0  N0a
    // ...() new node ..
    // N1
    //
    // N0.NV ::: (N1 => NEW)
    // N1.PV ::: (N0 => NEW)
    // NEW.PV ::: N0
    // NEW.NV ::: N1

    const trist = this
    const NEW = new Node(payload)

    const action = new Action(trist, Opcodes.Add)
    action.adds.push(NEW)

    if (trist.isEmpty) {
      action.setHead(NEW)
      action.addRLevel(NEW, level)
    }
    else {
      const range = trist.range()
      const N0 = range.focus || trist.lastVisible
      const N0a = N0 ? N0.lastDescendentOrSelf : trist.last
      const N1 = N0.NV
      action.chain(N0a, NEW, N1)
      action.chainVisibles(N0, NEW, N1)

      action.addRLevel(NEW, level - N0.level)
      if (N1) action.addRLevel(N1, N1.level - level)
    }
    action.setRange(NEW)
    action.redo()
    this.undoManager.add(action)
    return this
  }

  insert(payload, level = 0) {
    if (!_.isInteger(level)) throw `Invalid level (${level}) passed to trist.insert(...).`
    // const trist = this
    // const range = trist.range()
    // when we insert, what level do we insert at? at the level that is focused.
    const action = new Action(this, Opcodes.Insert)

    const NEW = new Node(payload)
    action.adds.push(NEW)
    const C = this.focus || this._head
    if (!C) {
      action.setHead(NEW) // empty document so no chaining or tricky level management needed
      if (level) action.addRLevel(NEW, level)
    }
    else {
      const A = C.PV
      const B = C.prev
      action.chain(B, NEW, C)
      action.chainVisibles(A, NEW, C)
      if (!A) action.setHead(NEW)
      // level management.....
      // assuming level is zero, we have to transfer rlevel from C to X
      // if level is non-zero, then we have to add to C.rlevel and subtract from X.rlevel
      const PV_LVL = A ? A.level : 0

      action.addRLevel(NEW, level - PV_LVL)
      action.addRLevel(C, C.level - level)
    }
    action.setRange(NEW)

    // action.extras.push({
    //     redo: () => {
    //       trist.onNodeAdded(NEW)
    //       trist.setRange(NEW)
    //     },
    //     undo: () => trist.onNodeRemoved(NEW)
    // })

    action.redo()
    this.undoManager.add(action)
    return this
  }

  buildPasteAction(clip, N, opcode) {
    const C0 = clip.first
    const C1 = clip.lastVisible
    const C1a = clip.last
    const Na = N ? N.lastDescendentOrSelf : this.last
    const T0 = Na ? Na.next : null

    const action = new Action(this, opcode)
    action.adds = clip.toArray()
    action.link(Na, C0)
    action.linkVisibles(N, C0)
    const NLVL = N ? N.level : 0
    action.addRLevel(C0, C0.level - NLVL)
    action.link(C1a, T0)
    action.linkVisibles(C1, T0)
    if (T0) action.addRLevel(T0, T0.level - C1.level)
    if (this.isEmpty) action.setHead(clip.first)
    action.tristAction.redo.isDirty = true
    return action
  }

  paste(clip, level = 0, cloner = null) {
    if (!_.isInteger(level) || level < 0) throw `Invalid level (${level}) passed to trist.paste(...).`
    // assuming this is paste after
    // A(BC)D(EF)  ==>  A(BC) W(X)Y(Z) D(EF)
    // ~<A>D  =>   ~<A>W
    // ~<W>Y       A<W>Y
    // W<Y>~       W<Y>D
    // A<D>~       Y<D>~

    if (!clip || clip.isEmpty) return this

    // prep the clip
    clip = clip.clone(cloner)
    normalize(clip.first) // sets it so or more nodes touches level 0
    if (level && level > 0) clip.first.rlevel += level  // add some level if requested

    // work out where to attach the clip
    const range = this.range()
    const N = range.last || this.lastVisible

    // build the action
    const action = this.buildPasteAction(clip, N, Opcodes.Paste)
    action.setRange(clip.first, clip.lastVisible)

    // do it!
    action.redo()
    this.undoManager.add(action)

    // all done
    return this
  }

  editFocusContent(revision) {
    this.editFocus({ trystup: revision })
  }

  editNodeContent(node, revision) {
    this.editNode(node, { trystup: revision })
  }
  editNode(node, edits) {
    const trist = this
    const payload = node.payload
    const oldValues = []
    for (let key in edits) oldValues[key] = payload[key]

    // ready to test editFocus (( and follow up with adding a link ))
    const wasClean = !trist.isDirty
    const operation = {
      redo: function () {
        for (let key in edits) payload[key] = edits[key]
        trist.touch()
        trist.onInvalidated()
      },
      undo: function () {
        for (let key in edits) payload[key] = oldValues[key]
        if (wasClean) trist.unTouch()
        trist.onInvalidated()
      }
    }
    operation.redo()
    this.undoManager.add(operation)
    return this
  }

  editFocus(edits) {
    const trist = this
    const range = trist.range()
    if (range.isEmpty) return
    const payload = range.focus.payload
    const oldValues = []
    for (let key in edits) oldValues[key] = payload[key]

    // ready to test editFocus (( and follow up with adding a link ))
    const wasClean = !trist.isDirty
    const operation = {
      redo: function () {
        trist._setRange(range.anchor, range.focus)
        for (let key in edits) payload[key] = edits[key]
        trist.touch()
        trist.onInvalidated()
      },
      undo: function () {
        trist._setRange(range.anchor, range.focus)
        for (let key in edits) payload[key] = oldValues[key]
        if (wasClean) trist.unTouch()
        trist.onInvalidated()
      }
    }
    operation.redo()
    this.undoManager.add(operation)
    return this
  }

  editRange(edits) {
    const trist = this
    const range = trist.range()
    if (range.isEmpty) return
    const vnodes = range.vnodes
    // const lineIds = _.map(vnodes, VN => VN.id)

    // {a:red, b:blue}
    // propNames => [a, b]


    const propNames = _.keys(edits)
    const oldValuesArray = _.map(vnodes, VN => {
      const propValues = _.map(propNames, PN => VN.payload[PN])
      // extracts [pink, orange] from rec1
      // extracts [blue,  brown] from rec2
      // ...
      return [VN.id, _.zipObject(propNames, propValues)]
    })
    // gives us an array...
    //  [line1:{a:pink,b:orange}]
    //  [line2:{a:blue,b:brown}]

    const oldValues = _.fromPairs(oldValuesArray)  // { lineId: {isBold:true, text:'there'}, lineId: { isBold:true, text:'hello' }, ... } }
    // const payload  = range.focus.payload
    // for (let key in edits) oldValues[key] = payload[key]


    // ready to test editFocus (( and follow up with adding a link ))
    const wasClean = !trist.isDirty
    const operation = {
      redo: function () {
        trist._setRange(range.anchor, range.focus)
        _.each(vnodes, VN => {
          _.each(propNames, PN => { VN.payload[PN] = edits[PN] })
        })
        trist.touch()
        trist.onInvalidated()
      },
      undo: function () {
        trist._setRange(range.anchor, range.focus)
        _.each(vnodes, VN => {
          const OV = oldValues[VN.id]
          _.each(propNames, PN => { VN.payload[PN] = OV[PN] })
        })
        if (wasClean) trist.unTouch()
        trist.onInvalidated()
      }
    }
    operation.redo()
    this.undoManager.add(operation)
    return this
  }

  edit(fnRedo, fnUndo) {
    const trist = this
    const range = trist.range()
    if (range.isEmpty) return
    const vnodes = range.vnodes
    const wasClean = !trist.isDirty
    const operation = {
      redo: function () {
        trist._setRange(range.anchor, range.focus)
        // lodash doesn't work here for some reason
        for (let i = 0; i < vnodes.length; i++) {
          const payload = vnodes[i].payload
          fnRedo(payload, i)
        }
        trist.touch()
      },
      undo: function () {
        for (let i = 0; i < vnodes.length; i++) {
          const payload = vnodes[i].payload
          fnUndo(payload, i)
        }
        // _(vnodes).map('payload').each(fnUndo); doesn't work here for some reason
        trist._setRange(range.anchor, range.focus)
        if (wasClean) trist.unTouch()
      }
    }
    operation.redo()
    this.undoManager.add(operation)
    return this
  }
  indent(offset) {
    if (!_.isNumber(offset)) offset = 1
    if (!this.canIndentN(offset)) return this
    const trist = this
    const range = trist.range()
    const rangelevel = range.level
    if (rangelevel + offset < 0) offset = -rangelevel

    const N = range.first
    const NV = range.last.NV

    const action = new Action(trist, Opcodes.Indent)
    action.addRLevel(N, N.rlevel + offset)
    if (NV) action.addRLevel(NV, NV.rlevel - offset)
    action.redo()
    this.undoManager.add(action)

    return this
  }
  moveDown(node, levels = 0) {
    if (!_.isInteger(levels)) throw `Invalid value (${levels}) passed to trist.moveDown(...).`
    if (!this.canMoveSomethingDown(node)) return this
    //   ..H1a
    // R0..R1a
    // X0..X1a
    // N..Na
    // T0..
    // ------------- or ---------------
    //   ..H1a
    // R0..R1a
    // N..Na
    // T0..

    // H0..H1a is the end of the head section
    // R0..R1a is the stuff to move
    // X0..X1a are middle nodes that get skipped
    // N0..N0a is the node (with children) BELOW which the range will be moved
    // T0..T1a is the tail node (attaches to R2a (redo) or N0a(undo))

    const trist = this
    const range = trist.range()

    const N = node || range.last.NV
    const zone = range.zoneOfSibling(N)
    if (zone === Zones.ABOVE) return this.moveUp(N, levels)
    const Na = N.lastDescendentOrSelf
    const T0 = N.NV

    const R0 = range.first
    const R1 = range.last
    const R1a = range.last.lastDescendentOrSelf
    const H1 = R0.PV

    const H1a = R0.prev

    let X0 = null
    // let X1a = null

    if (R1a.next !== N) {
      X0 = R1.NV
      // X1a = N.prev
    }

    const action = new Action(this, Opcodes.MoveDown)
    if (trist.first == R0) action.setHead(R1a.next)
    if (range.level + levels < 0) levels = -range.level
    // let nodesForLevel = levels ? range.nodes : null

    action.link(Na, R0)
    action.link(R1a, T0)
    action.linkVisibles(N, R0)
    action.addRLevel(R0, R0.level - N.level + levels)
    if (T0) action.addRLevel(T0, T0.level - (R1.level + levels))

    action.linkVisibles(R1, T0)
    if (X0) {
      action.link(H1a, X0)
      action.linkVisibles(H1, X0)
      let X0L = X0.level
      let H1L = H1 ? H1.level : 0
      action.addRLevel(X0, X0L - H1L)
    }
    else {
      action.link(H1a, N)
      action.linkVisibles(H1, N)
      let H1LVL = H1 ? H1.level : 0
      action.addRLevel(N, N.level - H1LVL)
    }

    action.tristAction.redo.isDirty = true
    this.undoManager.add(action)
    action.redo()
    return this
  }

  moveUp(N, levels = 0) {
    if (!_.isInteger(levels)) throw `Invalid levels (${levels}) passed to trist.moveUp(...).`
    // function connect(n1, n2) {
    //     if (n1) n1.next = n2
    //     if (n2) n2.prev = n1
    // }
    if (!this.canMoveSomethingUp(N)) return this

    const trist = this
    const range = trist.range()
    if (range.level + levels < 0) levels = -range.level
    if (!N) N = range.first.PV
    if (range.zoneOfSibling(N) === Zones.BELOW) return this.moveDown(N)
    const H1a = N.prev
    const Na = N.lastDescendentOrSelf

    const R0 = range.first

    const R1a = range.last.lastDescendentOrSelf
    const T0 = R1a.next
    let X0 = null
    let X1 = null
    let X1a = null
    if (R0.prev != Na) {  // we need R0.prev to not be Na to get in here
      X0 = Na.next     // null reference error -- so Na is null when we try to move up
      X1a = R0.prev    // Na but Na is above, so therefore Na must exist
      X1 = R0.PV
    }

    const H1 = N.PV
    const R1 = range.last

    const action = new Action(this, Opcodes.MoveUp)
    if (!H1a) action.setHead(R0)
    action.link(H1a, R0)
    action.link(R1a, N)

    action.linkVisibles(H1, R0)
    const H1LVL = H1 ? H1.level : 0
    action.addRLevel(R0, R0.level - H1LVL + levels)

    action.linkVisibles(R1, N)
    action.addRLevel(N, N.level - R1.level - levels)
    if (X0) {
      action.link(X1a, T0)
      action.linkVisibles(X1, T0)
      if (T0) action.addRLevel(T0, T0.level - X1.level)
    }
    else {
      action.link(Na, T0)
      action.linkVisibles(N, T0)
      if (T0) action.addRLevel(T0, T0.level - N.level)
    }

    action.tristAction.redo.isDirty = true
    this.undoManager.add(action)
    action.redo()
    return this
  }

  join(edit) {
    // redo: edit line1, delete line2
    // undo: edit line1, undelete line2
    if (!this.canJoin) return
    const trist = this
    const range = trist.range()
    const focus = range.focus

    const hug1 = focus
    const hug2 = hug1.next
    const R0 = hug2
    const R1 = hug2
    const H1 = hug1
    const T0 = R1.NV

    const R1a = hug2.lastDescendentOrSelf
    const H1a = R0.prev

    const action = new Action(this, Opcodes.Join)
    action.dels.push(hug2)
    action.link(null, R0)
    action.link(R1a, null)
    action.link(H1a, T0)

    action.linkVisibles(null, R0)
    action.linkVisibles(R1, null)
    action.linkVisibles(H1, T0)
    if (T0) {
      const H1LVL = H1 ? H1.level : 0
      action.addRLevel(T0, T0.level - H1LVL)
    }
    if (!H1) action.setHead(T0)
    action.extras.push(edit)
    action.redo()
    this.undoManager.add(action)
    return this
  }
  split(edit, clip) {
    // work out the attachment point
    const N = this.focus

    // prep the clip
    normalize(clip.first) // sets it so or more nodes touches level 0
    clip.first.rlevel += N.level  // add some level if requested

    // build the action
    const action = this.buildPasteAction(clip, N, Opcodes.Split)
    action.extras.push(edit)
    action.setRange(N, clip.lastVisible)

    // do it!
    action.redo()
    this.undoManager.add(action)

    // all done
    return this
  }

  buildRemoveAction(range, opcode) {
    const R0 = range.first
    const R1 = range.last
    const H1 = R0.PV
    const T0 = R1.NV

    const R1a = range.last.lastDescendentOrSelf
    const H1a = R0.prev

    const action = new Action(this, opcode)
    action.dels = action.dels.concat(range.toArray())
    action.link(null, R0)
    action.link(R1a, null)
    action.link(H1a, T0)

    action.linkVisibles(null, R0)
    action.linkVisibles(R1, null)
    action.linkVisibles(H1, T0)
    if (T0) {
      const H1LVL = H1 ? H1.level : 0
      action.addRLevel(T0, T0.level - H1LVL)
    }
    if (!H1) action.setHead(T0)
    action.setRange(T0 || H1)
    return action
  }


  remove() {
    if (!this.canDelete) return this
    const action = this.buildRemoveAction(this.range(), Opcodes.Delete)
    action.redo()
    this.undoManager.add(action)
    return this
  }
  moveSelection(toNode, levels = 0) {
    if (!_.isNumber(levels)) throw `Invalid levels (${levels}) passed to trist.moveSelection(...).`
    if (!this.canMoveSelection(toNode, levels)) return this
    switch (this.range().zoneOfSibling(toNode)) {
    case Zones.ABOVE: return this.moveUp(toNode, levels)
    case Zones.BELOW: return this.moveDown(toNode, levels)
    default: return this.indent(levels)
    }
  }
  log(s, ...t) {
    function extractId(x) {
      switch (typeof x) {
      case 'number': return x
      case 'string': return x
      case 'object':
        if (_.has(x, 'id')) return x.id
        if (_.has(x, 'payload')) return extractId(x.payload)
        return '{?}'
      }
    }
    if (t) {
      const u = _.map(t, extractId)
      s += '(' + u.join(',') + ')'
    }
    const log = this._log
    const same = (log.length > 0 && _.last(log).entry === s)
    if (same) _.last(log).count++
    else log.push({ entry: s, count: 1 })
  }
  RESET() { this._log = [] }
  DUMPLOG() {
    return _.map(this._log, function (entry) {
      let s = entry.count === 1 ? entry.entry : entry.entry + '[' + entry.count + ']'
      s = s.replace(/\(\)/g, '')
      return s
    })
  }
  DUMP(idField) {
    const ME = this
    function rangeChar(range, n) {
      if (n === ME.focus) return n === ME.anchor ? '*' : 'F'
      if (n == ME.anchor) return 'A'
    }
    const result = []
    let node = this._head
    const range = this.range()
    while (node != null) {
      const payload = node.payload
      const id = idField ? payload[idField] : payload
      let item = id + (node.isVisible ? '' : 'h')
      const rc = rangeChar(range, node)
      if (rc) item += rc
      // if (node.alevel !== node.level) item = '?' + item
      const level = node.level
      if (level > 0) item = Array(level + 1).join('.') + item
      result.push(item)
      node = node.next
    }
    let dump = result.join(',')
    if (this.isDirty) dump += '!'
    return dump
  }
  DUMP2(idField) {
    const ME = this
    function rangeChar(range, n) {
      if (n === ME.focus) return n === ME.anchor ? '*' : 'F'
      if (n == ME.anchor) return 'A'
    }
    const result = []
    const range = this.range()
    let node = this._head
    while (node != null) {
      const payload = node.payload
      const id = idField ? payload[idField] : payload
      let item = id + (node.isVisible ? '' : 'h')
      if (node.isDirty) item += '!'
      const rc = rangeChar(range, node)
      if (rc) item += rc
      if (node.level > 0) item = Array(node.level + 1).join('.') + item
      result.push(item)
      node = node.next
    }
    let dump = result.join(',')
    if (this.isDirty) dump += '>'
    return dump
  }
  openOne(node) {
    const trist = this
    if (!trist.canExpandSomething(node)) return trist
    // Open B:  AB(.C.D[..E..F].G.H)IJ  =>  AB.C.D[..E..F].G.HIJ
    //     B>I  ==>   B>C
    //   ~<C    ==>   B<C
    //     H>~  ==>   H>I
    //   B<I    ==>   H<I
    //
    // Open B:  100(.101)  =>  A.B
    // B = hug = 100
    // C = B.next = 101
    // H = B.lastChild() = 101
    // I = H.next = null
    // setup
    // redo
    //B.NV = C
    //C.PV = B
    //H.NV = I
    //if(I) I.PV = H

    const B = node
    const C = B.next
    const H = B.lastChild
    const I = B.NV

    const action = new Action(trist, Opcodes.OpenOne)
    action.linkVisibles(B, C)
    action.linkVisibles(H, I)
    if (I) action.addRLevel(I, I.level - H.level)
    if (!trist.isDirty) action.tristAction.redo.isDirty = false // the only time when we don't want to automatically set the dirty flag

    action.redo()
    trist.undoManager.add(action)
    return this
  }

  // 100F,.101,.102A,..103

  vids() { return this.range().vnodes.map(n => n.id) }
  open(nodeOrArray) {
    if (nodeOrArray instanceof Node) return this.openOne(nodeOrArray)
    if (!nodeOrArray) {
      const range = this.range()
      if (range.isEmpty) return this
      if (!range.isMultinode) return this.openOne(range.focus)
      nodeOrArray = range.vnodes
    }

    const action = new Action(this, Opcodes.Open)

    _.each(nodeOrArray, B => {
      const C = action.next(B)
      const H = action.lastChildOf(B)
      if (H) {  // some nodes in the array may be childless
        const I = action.NV(B)
        const nextClevel = action.levelOf(C) - action.levelOf(B)
        const nextILevel = action.levelOf(I) - action.levelOf(H)

        action.linkVisibles(B, C)
        action.addRLevel(C, nextClevel)
        action.linkVisibles(H, I)
        if (I) action.addRLevel(I, nextILevel)
      }
    })

    if (!this.isDirty) action.tristAction.redo.isDirty = false // the only time when we don't want to automatically set the dirty flag

    action.redo()
    this.undoManager.add(action)
    return this
  }
}

module.exports = Trist