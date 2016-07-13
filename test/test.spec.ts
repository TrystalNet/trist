//import {dumpTrist} from './helper'
import {JS,IMM} from '@trystal/interfaces'
import {HelperNode, buildChain, dump} from '@trystal/data-gen'
import {add, chainOps,collapse,chunk,indent} from '../src/trist'

import ChainIM = IMM.Chain
import Node = JS.Node 

const X = {id:'X'}
const A = 'A', B = 'B', C = 'C', D = 'D', E = 'E'
const chainFactory = (spec:string):ChainIM => Immutable.fromJS(buildChain(spec))
const dumpTrist = (chain:ChainIM):string => dump(chain.toJS())

const testCase = (spec:string):[string,string,ChainIM] => {
  const [AF,chainSpec] = spec.split(':')
  const [anchor,focus] = AF.split('')
  return [anchor,focus,chainFactory(chainSpec)]  
}

describe('Add Tests', function() {
  it('adds X(0) to the empty trist', () => {
    let chain = chainFactory('')
    chain = add(chain, null, X)
    expect(dumpTrist(chain)).toEqual('X')
  })
  it('adds X to A', () => {
    let chain = chainFactory(A)
    chain = add(chain, A, X)
    expect(dumpTrist(chain)).toEqual('AX')
  })
  it('adds X between A and B in AB', () => {
    let chain = chainFactory('AB')
    chain = add(chain, A, X)
    expect(dumpTrist(chain)).toEqual('AXB')
  })
  it('adds X between A and B in A.B', () => {
    let chain = chainFactory('A.B')
    chain = add(chain, A, X)
    expect(dumpTrist(chain)).toEqual('AX.B')
  })
  it('adds X to A(.b)', () => {
    let chain = chainFactory('A(.b)')
    chain = add(chain, A, X)
    expect(dumpTrist(chain)).toEqual('A(.b)X')
  })
  it('adds X to .A ==> .A.X', () => {
    let chain = chainFactory('.A')
    chain = add(chain, A, X)
    expect(dumpTrist(chain)).toEqual('.A.X')
  })
  it('Adds a line to a node that has hidden children',() => {
    let chain = chainFactory('A(.b).C')
    chain = add(chain, A, X)
    expect(dumpTrist(chain)).toEqual('A(.b)X.C')
  })
  it('Adds a line to a node that has hidden children when both at level > 0',() => {
    let chain = chainFactory('A.B(...c).D')
    chain = add(chain, B, X)
    expect(dumpTrist(chain)).toEqual('A.B(...c).X.D')
  })
})
describe('Sort Tests', function() {
  it('Sorts [C,A] into [A,C] for ABC', () => {
    let COPS = chainOps(chainFactory('ABC'))
    let [first,last] = COPS.sort(C, A)
    expect(first).toEqual(A)
    expect(last).toEqual(C)
  })
  it('Sorts [A,C] into [A,C] for ABC', () => {
    let COPS = chainOps(chainFactory('ABC'))
    let [first,last] = COPS.sort(A, C)
    expect(first).toEqual(A)
    expect(last).toEqual(C)
  })
  it('Sorts [C,E] into [C,E] for ABCDE', () => {
    let COPS = chainOps(chainFactory('ABCDE'))
    let [first,last] = COPS.sort(C, E)
    expect(first).toEqual(C)
    expect(last).toEqual(E)
  })
  it('Sorts [E,C] into [C,E] for ABCDE', () => {
    let COPS = chainOps(chainFactory('ABCDE'))
    let [first,last] = COPS.sort(E, C)
    expect(first).toEqual(C)
    expect(last).toEqual(E)
  })
  it('Sorts [B,C,D,E,A] into [A,B,C,D,E] for ABCDE', () => {
    let COPS = chainOps(chainFactory('ABCDE'))
    expect(COPS.sort(B, C, D, E, A).join('')).toEqual('ABCDE')
  })
})
describe('Indent Tests', function() {
  it('Indents BC in ABCD', () => {
    let chain = chainFactory('ABCD')
    chain = indent(chain, B, C, 1)
    expect(dumpTrist(chain)).toEqual('A.B.CD')
  })
  it('Indents A in A', () => {
    let chain = chainFactory('A')
    chain = indent(chain, A, A, 1)
    expect(dumpTrist(chain)).toEqual('.A')
  })
  it('Indents BA in ABC', () => {
    let chain = chainFactory('ABC')
    chain = indent(chain, B, A, 1)
    expect(dumpTrist(chain)).toEqual('.A.BC')
  })
  it('Indents CB in ABC', () => {
    let chain = chainFactory('ABC')
    chain = indent(chain, C, B, 1)
    expect(dumpTrist(chain)).toEqual('A.B.C')
  })
})
describe('VisibleId Tests', function() {
  it('returns BDE from BE:AB(.c).DEF', () => {
    let COPS = chainOps(chainFactory('AB(.c).DEF'))
    expect(COPS.vids(B,E).join('')).toEqual('BDE')
  })
  it('returns A from A', () => {
    let COPS = chainOps(chainFactory('A'))
    expect(COPS.vids(A, A).join('')).toEqual('A')
  })
  it('returns A from A(.b)', () => {
    let COPS = chainOps(chainFactory('A(.b)'))
    expect(COPS.vids(A, A).join('')).toEqual('A')
  })
  it('returns AC from A(.b)C', () => {
    let COPS = chainOps(chainFactory('A(.b)C'))
    expect(COPS.vids(A, C).join('')).toEqual('AC')
  })
  it('returns C from CC:A(.b)C', () => {
    let COPS = chainOps(chainFactory('A(.b)C'))
    expect(COPS.vids(C, C).join('')).toEqual('C')
  })
})
describe('Close Tests', function() {
  const tests = [
    ['closes a single open node', 'AA:A.B','A(.B)'],
    ['closes a buried node with two children', 'BB:AB.C.DE','AB(.C.D)E'],
    ['closes multiple nodes', 'AC:A.BC.D','A(.B)C(.D)'],
    ['Bug June 2', 'BB:AB.C.DE','AB(.C.D)E'],
    ['Does a partial close, including external tail','AD:A.B..C.D..EF','A.B(..C).D(..E)F'],
    ['Does a partial close, with internal tail','AF:A.B..C.D..EF','A.B(..C).D(..E)F'],
    ['Does a partial close, with no tail.NV node','AD:A.B..C.D..E','A.B(..C).D(..E)']
  ] 
  tests.forEach(([title, inSpec, outSpec]) => {
    it(title,() => {
      const [anchor,focus,chain] = testCase(inSpec)
      const OUT = collapse(chain, anchor, focus)
      expect(dumpTrist(OUT)).toEqual(outSpec)    
    }) 
  })
})
describe('Heads Tests',function() {
  it('identies the heads in A.B(.C..D).E(.F) as ACF', () => {
    let COPS = chainOps(chainFactory('A.B(.C..D).E(.F)'))
    expect(COPS.heads().join('')).toEqual('ACF')
  })
})
describe('Extracts vchains', function() {
  it('Gets three vchains from A.B(.C..D).E(.F)',() => {
    let COPS = chainOps(chainFactory('A.B(.C..D).E(.F)'))
    expect(COPS.vchains().map(item => item.length).join('')).toEqual('321')
  })
})
describe('Chunks', function() {
  it('chunks ABCD EFG into ABCDW(.E.F.G)',() => {  
    let chain = chainFactory('ABCDEFG')
    let COPS = chainOps(chain)
    chain = chunk(chain, 4, n => ({ id: 'WMNOP'[n]}))
    expect(dumpTrist(chain)).toEqual('ABCDW(.E.F.G)')
  })

  it('chunks and rechunks ABC DEF G into ABw(.C.D)Q(.x(..E..F).y)(..G)',() => {  
    // ABC DEF G => ABC w(DE)x(FG) => AB CQ(wx) => ABm(CQ(w(DE)x(FG)))
    let chain = chainFactory('ABCDEFG')
    // AB/CD/EF/G
    let COPS = chainOps(chain)
    chain = chunk(chain, 3, n => ({ id: 'wxyQmJKLM'[n]}))
    expect(dumpTrist(chain)).toEqual('ABw(.C.D)Q(.x(..E..F).y)(..G)')
  })
})


