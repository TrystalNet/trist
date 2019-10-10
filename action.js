const {extend,last,difference,each,pick,keys} = require('lodash')
const NodeAction = require('./node-action')

class Action {
    constructor(trist, opcode) {
        this.extras      = []
        this.adds        = []
        this.dels        = []
        this.trist       = trist
        this.opCode      = opcode
        this.nodeActions = {}
        this.trist       = trist
        this.opcode      = opcode
        
        const {anchor, focus, isDirty} = trist
        
        this.tristAction = {
            redo: { isDirty : true, anchor, focus },
            undo: { isDirty, anchor, focus }
        }
    }

    levelOf(N) {
        if (!N) return 0
        //var hid = N.id
        let level = this.rlevel(N)
        let H = N
        while (this.prev(H)) {
            while (this.PV(H)) {
                H = this.PV(H)
                level += this.rlevel(H)
            }
            if (this.prev(H)) {
                H = this.prev(H) // move to parent
                level += this.rlevel(H)
            }
        }
        return level
    }
    childrenOf(N) {
        // these are siblings of my FC, nothing more, nothing less
        var next = this.next(N)
        if (!next) return [] // end of the document
        if (this.PV(next) != null) return []
        var result = []
        while (next != null) result.push(next), next = this.NV(next)
        return result
    }
    lastChildOf(N) {
        var c = this.childrenOf(N)
        return c.length > 0 ? last(c) : null
    }


    // node methods
    _add(node) {
        var hid = node.id
        if (!this.nodeActions[hid]) {
            this.nodeActions[hid] = new NodeAction(node)
            this.nodeActions[hid].redo.isDirty = true
        }
    }
    add(node, state) {
        this._add(node)
        extend(this.nodeActions[node.id].redo, state)
    }
    chainVisibles(PV, X, NV) {
        if (PV) {
            this._add(PV)
            this.nodeActions[PV.id].redo.NV = X
        }
        this._add(X)
        this.nodeActions[X.id].redo.PV = PV
        this.nodeActions[X.id].redo.NV = NV
        if (NV) {
            this._add(NV)
            this.nodeActions[NV.id].redo.PV = X
        }
    }
    linkVisibles(PV, NV) {
        if (PV) {
            this._add(PV)
            this.nodeActions[PV.id].redo.NV = NV
        }
        if (NV) {
            this._add(NV)
            this.nodeActions[NV.id].redo.PV = PV
        }
        // var PVLevel = PV ? PV.level : 0
    }
    chain(P, X, N) {
        if (P) {
            this._add(P)
            this.nodeActions[P.id].redo.next = X
        }
        this._add(X)
        this.nodeActions[X.id].redo.prev = P
        this.nodeActions[X.id].redo.next = N
        if (N) {
            this._add(N)
            this.nodeActions[N.id].redo.prev = X
        }
    }
    next(N) {
        if (!N) return null
        var nodeAction = this.nodeActions[N.id]
        return nodeAction ? nodeAction.next : N.next
    }
    prev(N) {
        if (!N) return null
        var nodeAction = this.nodeActions[N.id]
        return nodeAction ? nodeAction.prev : N.prev
    }
    NV(N) {
        if (!N) return null
        var nodeAction = this.nodeActions[N.id]
        return nodeAction ? nodeAction.NV : N.NV
    }
    PV(N) {
        if (!N) return null
        var nodeAction = this.nodeActions[N.id]
        return nodeAction ? nodeAction.PV : N.PV
    }
    rlevel(N) {
        if (!N) return null
        var id = N.id
        var nodeAction = this.nodeActions[id]
        return nodeAction ? nodeAction.rlevel : N.rlevel
    }
    link(P, N) {
        if (P) {
            this._add(P)
            this.nodeActions[P.id].redo.next = N
        }
        if (N) {
            this._add(N)
            this.nodeActions[N.id].redo.prev = P
        }
    }
    addPV(node, PV) {
        if (!node) return
        this._add(node)
        this.nodeActions[node.id].redo.PV = PV
    }
    addNV(node, NV) {
        if (!node) return
        this._add(node)
        this.nodeActions[node.id].redo.NV = NV
    }
    addNext(node, next) {
        if (!node) return
        this._add(node)
        this.nodeActions[node.id].redo.next = next
    }
    addRLevel(node, rlevel) {
        if (!node) return
        this._add(node)
        this.nodeActions[node.id].redo.rlevel = rlevel
    }
    addPrev(node, prev) {
        if (!node) return
        this._add(node)
        this.nodeActions[node.id].redo.prev = prev
    }
    // trist methods
    addTristEdits(edits) {
        var ta = this.tristAction
        extend(ta.redo, edits)
    }

    checkit() {
        var N = this._trist.first
        while (N) {
            if (N.NV && N.NV != N) throw new Error(`${N.id} is not correctly NV-paired with ${N.NV.id}`)
            if (N.PV && N.PV.NV != N) throw new Error(`${N.id} is not correctly PV-paired with ${N.PV.id}`)
            if (N.NV && !N.next) throw new Error(`${N.id} has become disconnected from next`)
            if (N.PV && !N.prev) throw new Error(`${N.id} has become disconnected from prev`)
            N = N.NV
        }
    }
    applyTristState(TS) {
        const trist = this.trist
        if(TS._head) trist.first = TS._head
        trist.setRange(TS.anchor, TS.focus)
        trist.isDirty = TS.isDirty
    }
  // main methods
    redo() {
        this.buildUndo()
        var trist = this.trist
        var ADDS = this._adds || []
        var DELS = this._dels || []
        each((ADDS), A => { trist.nodes.push(A) })
        if (DELS.length) trist.nodes = difference(trist.nodes, DELS)

        each(this.nodeActions, ha => { extend(ha.node, ha.redo) } )
        if(this.extras) this.extras.forEach(extra => extra.redo())

        // each(ADDS, A => trist.onNodeAdded(A))
        // each(DELS, A => trist.onNodeRemoved(A, []))
        // the problem is how to notify the world that we need to refresh the node above the range start
        // ideally, there would be an event just for that.
        // if it was just one node, then it woud be easier...
        // added nodes can also change the state of the prior visible node
        this.applyTristState(this.tristAction.redo) //
        // if(this.tristAction.redo.isDirty !== this.tristAction.undo.isDirty) trist.onDirtyChanged()
        trist.onInvalidated()
    }

    undo() {
        let trist = this.trist
        function undoTheAdds(adds) {
            if(!adds || !adds.length) return
            var len = adds.length
            trist.nodes.splice(trist.nodes.length - len, len)
        }
        function undoTheDels(dels) {
            if(!dels || !dels.length) return
            trist.nodes = trist.nodes.concat(dels)
        }
        function undoTheEdits(actions) { 
            each(actions,(ha) => { extend(ha.node, ha.undo) })
        }
        undoTheAdds(this._adds)
        undoTheDels(this._dels)
        undoTheEdits(this.nodeActions)
        if(this.extras) each(this.extras, extra => extra.undo())
        // each(this.dels, A => trist.onNodeAdded(A))
        // each(this.adds, A => trist.onNodeRemoved(A))
        this.applyTristState(this.tristAction.undo)
        // if(this.tristAction.redo.isDirty !== this.tristAction.undo.isDirty) trist.onDirtyChanged()
        trist.onInvalidated()
    }
    buildUndo() {
        each(this.nodeActions, nodeAction => { nodeAction.undo = pick(nodeAction.node, keys(nodeAction.redo)) })
        this.tristAction.undo = pick(this.trist, keys(this.tristAction.redo))
    }
    setRange(anchor, focus) {
        this.tristAction.redo.anchor = anchor
        this.tristAction.redo.focus = focus || anchor
    }
    setHead(head) {
        this.tristAction.redo._head = head
    }
}

module.exports = Action