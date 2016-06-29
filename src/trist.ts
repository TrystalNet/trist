console.log('16-06-28B')

import { Map, List } from 'immutable';

export type PayloadPropName = 'id' | 'trystup' | 'format';
export type NodePropName = 'id' | 'rlevel' | 'prev' | 'next' | 'PV' | 'NV' | 'payload';
export type fnStrToNumber = (s: string) => number;
export type fnStrToStr = (s: string) => string;
export namespace JS {
    export interface Payload {
        id: string;
        trystup?: string;
    }
    export interface Node {
        id: string;
        prev?: string;
        next?: string;
        PV?: string;
        NV?: string;
        rlevel?: number;
        payload?: Payload;
    }
}
export interface Payload extends Map<PayloadPropName, string> {
    toJS(): JS.Payload;
}
export interface Node extends Map<NodePropName, Payload | string | number> {
    toJS(): JS.Node;
}
export type Chain = Map<string, Node>;
export type IDList = List<string>;


const nodeProp  = (node:Node, propname:NodePropName) => node ? node.get(propname) : null  
const rlevel    = (node:Node) => <number>nodeProp(node, 'rlevel')
const prevId    = (node:Node) => <string>nodeProp(node, 'prev')
const nextId    = (node:Node) => <string>nodeProp(node, 'next')
const PVId      = (node:Node) => <string>nodeProp(node, 'PV')
const NVId      = (node:Node) => <string>nodeProp(node, 'NV')
const payload   = (node:Node) => <Payload>nodeProp(node,'payload')

const _connect = (chain:Chain, prevProp:NodePropName, nextProp:NodePropName, ...ids:string[]):Chain => {
  ids.forEach((id, index) => {
    if(id) {
      if(index > 0) chain = chain.setIn([id,prevProp],ids[index-1])
      if(index < ids.length - 1) chain = chain.setIn([id,nextProp],ids[index+1])
    }
  })
  return chain
}
const connect = (chain:Chain, ...ids:string[]) => _connect(chain, 'prev','next', ...ids)
const connectV = (chain:Chain, ...ids:string[]) => _connect(chain, 'PV', 'NV', ...ids)

export function chainOps(chain:Chain) {
  const node   = (id:string):Node => chain.get(id)
  const pid    = (id:string):string => chain.getIn([id,'prev'])
  const pvid   = (id:string):string => chain.getIn([id,'PV'])
  const nid    = (id:string):string => chain.getIn([id,'next'])
  const nvid   = (id:string):string => chain.getIn([id,'NV'])
  const rlevel = (id:string):number => chain.getIn([id,'rlevel']) || 0
  const payload = (id:string):Payload => chain.getIn([id,'payload'])

  const head = ():string => chain.first() ? hid(<string>chain.first().get('id')) : null
  const last = ():string => chain.last() ? tid(<string>chain.last().get('id')) : null 

  const hid  = (id:string):string => !pid(id)  ? id : hid(pvid(id) || pid(id)) 
  const hvid = (id:string):string => !pvid(id) ? id : hvid(pvid(id))
  const tid  = (id:string):string => !nid(id)  ? id : tid(nvid(id) || nid(id)) 
  const tvid = (id:string):string => !nvid(id) ? id : tvid(nvid(id))

  const level = (id:string):number => !id ? 0 : rlevel(id) + level(pvid(id) || pid(id))
  const lastChildOrSelfId = (id:string):string => id ? (nvid(id) ? pid(nvid(id)) : tid(id)) : null

  // these are just for testing
  const ids = (id:string):IDList => !id ? Immutable.List<string>() : ids(nid(id)).unshift(id)
  const rlevels = (id:string) => ids(id).map(id => rlevel(id))
  const pvids = (id:string) => ids(id).map(id=>pvid(id)) 
  const nvids = (id:string) => ids(id).map(id=>nvid(id))

  const vids = (A:string,B:string):string[] => A === B ? [A] : [A,...vids(nvid(A),B)]
  const isOpen = (id:string):boolean => rlevel(nvid(id)) > 0
  const isClosed = (id:string):boolean => nid(id) && !pvid(nid(id))
  const isBoth = (id:string):boolean => isOpen(id) && isClosed(id)

  const contextLevel = (id:string):number => level(pvid(id) || pid(id))
  const vlevels = (A:string,B:string) => vids(A,B).map(id => ({id, vlevel: contextLevel(A) + rlevel(id)}))

  const lastVisibleChildId = (id:string):string => {
    let lvc = nvid(id)
    let lvl = rlevel(lvc)
    if(!lvc || lvl <= 0) return null
    while(nvid(lvc) && (lvl + rlevel(nvid(lvc)) > 0)) {
      lvc = nvid(lvc)
      lvl += rlevel(lvc)
    }
    return lvc
  }

// 1 2 3 4
//   A          +1
//       B      +2
//     C        -1


  const compare = (A:string, B:string) => {
    if(A === B) return 0
    let back = pid(A)
    let forward = nid(A)
    while(back && forward && back !== B && forward !== B) {
      back = pid(back)
      forward = nid(forward)
    }
    if(back === B || forward === null) return 1
    return -1
  }
  const sort = (...ids:string[]):string[] => ids.sort(compare)
  const heads = ():string[] => chain.keySeq().filter(id => !pvid(id)).toArray() 
  const vchainLength = (id:string):number => !id ? 0 : 1 + vchainLength(nvid(id))
  const vchains = () => heads().map(id => ({id, length:vchainLength(id)}))
  const vchain = (id:string):string[] => !nvid(id) ? [id] : [id,...vchain(nvid(id))] 

  return {
    node, head,
    pid,nid,pvid,nvid,rlevel,
    hid,hvid,tid,tvid,
    level,
    lastChildOrSelfId, lastVisibleChildId,
    ids, vids, pvids, nvids, rlevels,
    sort, vlevels,
    isOpen, isClosed, isBoth,
    heads, vchains, vchain, vchainLength
  }
}

export function chainify(payloads:JS.Payload[],fnLevel:fnStrToNumber=id=>0) : Chain {
  return Immutable.fromJS(payloads.reduce((accum, payload, index) => {
    const {id} = payload
    const prev = index ? payloads[index-1].id : null
    const next = index < payloads.length - 1 ? payloads[index+1].id : null
    const rlevel = fnLevel(id) - (index > 0 ? fnLevel(payloads[index-1].id) : 0)
    accum[id] = {id,prev,next,PV:prev,NV:next, rlevel}
    return accum
  },{}))
}

export function collapseAll(chain:Chain, fnLevel:fnStrToNumber) {
  // levels:  [id,id,...], [level,level,...]
  // output:  [{id,PV,rlevel,...},{id,PV,rlevel,...},...]
  const stack = <string[]>[]
  const getPVId = (level:number) => {
    let pvId = <string>null
    while(!_.isEmpty(stack) && fnLevel(_.last(stack)) >= level) pvId = stack.pop()
    return pvId
  }
  const C = chainOps(chain)
  let id = C.head()
  while(id) {
    const level = fnLevel(id)
    const pvId = getPVId(level)
    const lid = pvId || C.pid(id)
    let node=chain.get(id)
    .set('rlevel', level - (lid ? fnLevel(lid) : 0))
    .set('PV',pvId)
    .set('NV',null)
    if(pvId) chain = chain.setIn([pvId,'NV'],id)
    chain = chain.set(id,node)  
    stack.push(id)
    id = C.nid(id)
  }
  return chain
}
export function add(chain:Chain, focusId:string, payload:JS.Payload) {
  const {id} = payload
  const ipayload = Immutable.fromJS({id,payload})
  if(chain.isEmpty()) {
    chain = chain.set(id, ipayload) 
    chain = chain.setIn([id,'rlevel'],0)
  }
  else {
    const CHAIN = chainOps(chain)
    const A = focusId || CHAIN.tid(chain.last().get('id') as string)
    const A2 = CHAIN.lastChildOrSelfId(A)
    const B = id
    const C = CHAIN.nvid(A)

    chain = chain.set(B, ipayload) 
    chain = connect(chain, A2, B, C)
    chain = connectV(chain, A, B, C)
    chain = chain.setIn([B,'rlevel'],0)
  }
  return chain
}
export function indent(chain:Chain, anchorId:string, focusId:string, offset:number) {
  const COPS = chainOps(chain)
  const [first,last] = COPS.sort(anchorId, focusId)
  chain = chain.setIn([first, 'rlevel'], COPS.rlevel(first) + offset)
  const nvid = COPS.nvid(last)
  if(nvid) chain = chain.setIn([nvid,'rlevel'], COPS.rlevel(nvid) - offset)
  return chain
}
const groupSize = (maxSize:number, itemCount:number) => Math.round(itemCount / Math.ceil(itemCount / maxSize)) 

export function chunk(chain:Chain, tgtSize:number, fnPayload:(counter:number)=>JS.Payload) {
  let counter = 0;
  let COPS = chainOps(chain)
  let vchain = _.find(COPS.vchains(), vchain => vchain.length > tgtSize * 1.4)
  while(vchain) {
    const {id,length} = vchain
    const gs = groupSize(tgtSize, length)
    const S1 = COPS.vchain(id) // string[]
    const S2 = _.chunk(S1, gs) // string[][]
    const S3 = _.tail(S2) // string[][]
    const As = S3.map(S3 => _.first(S3))
    const payloads = As.map(item => fnPayload(counter++))
    As.forEach((A:string,index:number) => chain = add(chain, COPS.pvid(A), payloads[index]))
    S3.forEach((chunk:string[]) => chain = indent(chain, _.first(chunk), _.last(chunk), 1)) 
    S3.forEach((chunk:string[],index:number) => chain = collapse(chain, payloads[index].id, payloads[index].id)) 
    COPS = chainOps(chain)
    vchain = _.find(COPS.vchains(), vchain => vchain.length > tgtSize * 1.4)
  }
  return chain
}

export function collapse(chain:Chain, anchor:string, focus:string) {
  // only closes one level at a time
  const COPS = chainOps(chain)
  const sorted = COPS.sort(anchor,focus)
  const vids = COPS.vids(sorted[0],sorted[1])
  let work = vids.filter(id => COPS.isOpen(id)).map(id => ({id, level: COPS.level(id)}))
  const maxLevel = Math.max(...work.map(item => item.level))
  work = work.filter(pp => pp.level === maxLevel)
  _.each(work, ({id:A,level}) => {
    const B = COPS.nvid(A)             // must exist, or collapse is not possible
    const C = COPS.lastVisibleChildId(A) // must exist, for the same reason
    const D = COPS.nvid(C)
    chain = connectV(chain, A, D)
    chain = chain.setIn([B, 'PV'], null).setIn([C, 'NV'], null)
    if (D) chain = chain.setIn([D, 'rlevel'], COPS.level(D) - level)
  })
  return chain
}
