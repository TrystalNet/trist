import { Map, List, Iterable } from 'immutable';
import { IMM, Payload } from '@trystal/interfaces'

import ChainIM = IMM.Chain.IState

export type fnStrToNumber = (s: string) => number;
export type fnStrToStr = (s: string) => string;
export function chainOps(chain: ChainIM): {
    node: (id: string) => Node;
    head: () => string;
    pid: (id: string) => string;
    nid: (id: string) => string;
    pvid: (id: string) => string;
    nvid: (id: string) => string;
    rlevel: (id: string) => number;
    hid: (id: string) => string;
    hvid: (id: string) => string;
    tid: (id: string) => string;
    tvid: (id: string) => string;
    level: (id: string) => number;
    lastChildOrSelfId: (id: string) => string;
    lastVisibleChildId: (id: string) => string;
    ids: (id: string) => List<string>;
    vids: (A: string, B: string) => string[];
    pvids: (id: string) => Iterable<number, string>;
    nvids: (id: string) => Iterable<number, string>;
    rlevels: (id: string) => Iterable<number, number>;
    sort: (...ids: string[]) => string[];
    vlevels: (A: string, B: string) => {
        id: string;
        vlevel: number;
    }[];
    isOpen: (id: string) => boolean;
    isClosed: (id: string) => boolean;
    isBoth: (id: string) => boolean;
    heads: () => string[];
    vchains: () => {
        id: string;
        length: number;
    }[];
    vchain: (id: string) => string[];
    vchainLength: (id: string) => number;
};
export function chainify(payloads: Payload[], fnLevel?: fnStrToNumber): ChainIM;
export function collapseAll(chain: ChainIM, fnLevel: fnStrToNumber): ChainIM;
export function add(chain: ChainIM, focusId: string, payload: Payload): ChainIM;
export function indent(chain: ChainIM, anchorId: string, focusId: string, offset: number): ChainIM
export function chunk(chain: ChainIM, tgtSize: number, fnPayload: (counter: number) => Payload): ChainIM
export function collapse(chain: ChainIM, anchor: string, focus: string): ChainIM
