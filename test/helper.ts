import {chainOps, Chain, JS} from '../src/trist'

// const TOARRAY = (head:string, nodes, visibles=false) => {
//   let result = <string[]>[], id=head
//   let prop = visibles ? 'NV' : 'next'
//   while(id) {
//     result.push(nodes[id])
//     id = _.last(result)[prop]
//   }
//   return result
// }

export const dumpTrist = (chain:Chain) => {
  let COPS = chainOps(chain)
  const ids = COPS.ids(COPS.head())
  let stackSize = 0
  return ids.map((id:string) => {
    const level = COPS.level(id)
    let str = _.repeat('.', level) + id
    if(!COPS.pvid(id) && !!COPS.pid(id)) { str = '(' + str; stackSize++ }
    if(!COPS.nvid(id) && !!COPS.nid(id) && stackSize > 0) { str = str + ')'; stackSize-- }
    return str
  }).join('') + _.repeat(')', stackSize)
}

interface HelperNode extends JS.Node {
  level?:number,
  isHead?:boolean
  isTail?:boolean
}

export function buildNodes(nodeSpec:string) {
  if(_.isEmpty(nodeSpec)) return {}

  const matchToNode = (match:string) => {
    const [,P1,dots,id,P2] = /^(\(?)(\.*)([a-zA-Z0-9]+)(\)?)$/.exec(match)

    const P = <JS.Payload>{id}

    const node:HelperNode = {id, level:dots.length, payload:{id:'ketchups'}}
    if(P1 === '(') node.isHead = true
    if(P2 === ')') node.isTail = true
    return node
  }
  
  const matches = nodeSpec.match(/(\(?\.*[A-Z]\)?)/ig)
  const ALL = matches.map(C => matchToNode(C))
  
  const ids = ALL.map(item => item.id)
  ALL.forEach((item, index) => { item.prev = (index > 0) ? ids[index-1] : null })
  ALL.forEach((item, index) => { item.next = (index < (ALL.length - 1)) ? ids[index+1]: null })

  const stack = <HelperNode[]>[]
  // A(bc)XYZ(d)Q
  // stack = A / Ab / Ac / A / X / Y / Z / Zd / Z / Q
  ALL.forEach((item) => {
    if(item.isHead || _.isEmpty(stack)) stack.push(item)
    else {
      item.PV = _.last(stack).id
      stack[stack.length - 1] = item
    }
    if(item.isTail) stack.pop()
  })

  const NODES = ALL.reduce((acc, item) => {
    acc[item.id] = item 
    return acc 
  }, {})

  ALL.filter(item => !!item.PV).forEach(item => NODES[item.PV].NV = item.id)
  ALL.forEach(item => {
    if(item.PV) item.rlevel = item.level - NODES[item.PV].level
    else if(item.prev) item.rlevel = item.level - NODES[item.prev].level
    else item.rlevel = item.level
  })

  // how to connect NVPV sequences? Parens?
  // A|(.b|..c|(X|Y|Z)|d)|Q
  return NODES
}
