console.log('16-76-20A')
import * as _ from 'lodash' 
import { Map, List, fromJS } from 'immutable';

import {Payload, Node, IMM} from '@trystal/interfaces'

import NodeIM = IMM.Node.IState
import PayloadIM = IMM.Payload.IState
import ChainIM = IMM.Chain.IState
import NodePropName = IMM.Node.PropName
import IDListIM = IMM.IDList

export type fnStrToNumber = (s: string) => number;
export type fnStrToStr = (s: string) => string;

const nodeProp  = (node:NodeIM, propname:NodePropName) => node ? node.get(propname) : null  
const rlevel    = (node:NodeIM) => <number>nodeProp(node, 'rlevel')
const prevId    = (node:NodeIM) => <string>nodeProp(node, 'prev')
const nextId    = (node:NodeIM) => <string>nodeProp(node, 'next')
const PVId      = (node:NodeIM) => <string>nodeProp(node, 'PV')
const NVId      = (node:NodeIM) => <string>nodeProp(node, 'NV')
const payload   = (node:NodeIM) => <PayloadIM>nodeProp(node,'payload')

const _connect = (chain:ChainIM, prevProp:NodePropName, nextProp:NodePropName, ...ids:(string|null)[]):ChainIM => {
  ids.forEach((id, index) => {
    if(id) {
      if(index > 0) chain = chain.setIn([id,prevProp],ids[index-1])
      if(index < ids.length - 1) chain = chain.setIn([id,nextProp],ids[index+1])
    }
  })
  return chain
}
const connect = (chain:ChainIM, ...ids:(string|null)[]) => _connect(chain, 'prev','next', ...ids)
const connectV = (chain:ChainIM, ...ids:(string|null)[]) => _connect(chain, 'PV', 'NV', ...ids)

export function chainOps(chain:ChainIM) {
  const node   = (id:string):NodeIM => chain.get(id)
  const pid    = (id:string):string => chain.getIn([id,'prev'])
  const pvid   = (id:string):string => chain.getIn([id,'PV'])
  const nid    = (id:string):string => chain.getIn([id,'next'])
  const nvid   = (id:string):string => chain.getIn([id,'NV'])
  const rlevel = (id:string):number => chain.getIn([id,'rlevel']) || 0
  const payload = (id:string):PayloadIM => chain.getIn([id,'payload'])

  // recursive, so have to be function, can't be const
  function hid(id:string):string { return !pid(id) ? id : hid(pvid(id) || pid(id)) } 
  function tid(id:string):string { return !nid(id)  ? id : tid(nvid(id) || nid(id))  } 
  function hvid(id:string):string { return !pvid(id) ? id : hvid(pvid(id)) }
  function tvid(id:string):string { return !nvid(id) ? id : tvid(nvid(id)) }
  function level(id:string):number{ return !id ? 0 : rlevel(id) + level(pvid(id) || pid(id)) }

  const head = ():string|null => {
    var CF = chain.first()
    if(CF) return hid(<string>chain.first().get('id'))
    return null 
  }


  const last = ():string|null => chain.last() ? tid(<string>chain.last().get('id')) : null 

  function lastChildOrSelfId(id:string):string|null {
    if(!id) return null 
    return nvid(id) ? pid(nvid(id)) : tid(id) 
  }

  // these are just for testing
  function ids(id:string):IDListIM { return !id ? List<string>() : ids(nid(id)).unshift(id) }
  const rlevels = (id:string) => ids(id).map(id => rlevel(id!))
  const pvids = (id:string) => ids(id).map(id=>pvid(id!)) 
  const nvids = (id:string) => ids(id).map(id=>nvid(id!))

  function vids(A:string,B:string):string[] { return A === B ? [A] : [A,...vids(nvid(A),B)] }
  const isOpen = (id:string):boolean => rlevel(nvid(id)) > 0
  const isClosed = (id:string):boolean => nid(id) && !pvid(nid(id))
  const isBoth = (id:string):boolean => isOpen(id) && isClosed(id)

  const contextLevel = (id:string):number => level(pvid(id) || pid(id))
  const vlevels = (A:string,B:string) => vids(A,B).map(id => ({id, vlevel: contextLevel(A) + rlevel(id)}))

  const lastVisibleChildId = (id:string):string|null => {
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
  const heads = ():string[] => chain.keySeq().filter(id => !pvid(id!)).toArray() 
  function vchainLength(id:string):number { return !id ? 0 : 1 + vchainLength(nvid(id)) }
  const vchains = () => heads().map(id => ({id, length:vchainLength(id)}))
  function vchain(id:string):string[] { return !nvid(id) ? [id] : [id,...vchain(nvid(id))] } 

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

export function chainify(payloads:Payload[],fnLevel:fnStrToNumber=id=>0) : ChainIM {
  return fromJS(payloads.reduce((accum, payload, index) => {
    const {id} = payload
    const prev = index ? payloads[index-1].id : null
    const next = index < payloads.length - 1 ? payloads[index+1].id : null
    const rlevel = fnLevel(id) - (index > 0 ? fnLevel(payloads[index-1].id) : 0)
    accum[id] = {id,prev,next,PV:prev,NV:next, rlevel}
    return accum
  },{}))
}

export function collapseAll(chain:ChainIM, fnLevel:fnStrToNumber) {
  // levels:  [id,id,...], [level,level,...]
  // output:  [{id,PV,rlevel,...},{id,PV,rlevel,...},...]
  const stack = <string[]>[]
  const getPVId = (level:number) => {
    let pvId = <string|null|undefined>null
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
    .set('PV',pvId!)
    .set('NV', null)
    if(pvId) chain = chain.setIn([pvId,'NV'],id)
    chain = chain.set(id,node)  
    stack.push(id)
    id = C.nid(id)
  }
  return chain
}
export function add(chain:ChainIM, focusId:string, payload:Payload) {
  const {id} = payload
  const ipayload = fromJS({id,payload})
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
export function indent(chain:ChainIM, anchorId:string, focusId:string, offset:number) {
  const COPS = chainOps(chain)
  const [first,last] = COPS.sort(anchorId, focusId)
  chain = chain.setIn([first, 'rlevel'], COPS.rlevel(first) + offset)
  const nvid = COPS.nvid(last)
  if(nvid) chain = chain.setIn([nvid,'rlevel'], COPS.rlevel(nvid) - offset)
  return chain
}
const groupSize = (maxSize:number, itemCount:number) => Math.round(itemCount / Math.ceil(itemCount / maxSize)) 

export function chunk(chain:ChainIM, tgtSize:number, fnPayload:(counter:number)=>Payload) {
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

export function collapse(chain:ChainIM, anchor:string, focus:string) {
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
    const D = C ? COPS.nvid(C) : null
    chain = connectV(chain, A, D)
    chain = chain.setIn([B, 'PV'], null).setIn([C, 'NV'], null)
    if (D) chain = chain.setIn([D, 'rlevel'], COPS.level(D) - level)
  })
  return chain
}
