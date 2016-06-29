import { Map, List } from 'immutable';
export declare type PayloadPropName = 'id' | 'trystup' | 'format';
export declare type NodePropName = 'id' | 'rlevel' | 'prev' | 'next' | 'PV' | 'NV' | 'payload';
export declare type fnStrToNumber = (s: string) => number;
export declare type fnStrToStr = (s: string) => string;
export declare namespace JS {
    interface Payload {
        id: string;
        trystup?: string;
    }
    interface Node {
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
export declare type Chain = Map<string, Node>;
export declare type IDList = List<string>;
export declare function chainOps(chain: Chain): {
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
    pvids: (id: string) => Immutable.Iterable<number, string>;
    nvids: (id: string) => Immutable.Iterable<number, string>;
    rlevels: (id: string) => Immutable.Iterable<number, number>;
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
export declare function chainify(payloads: JS.Payload[], fnLevel?: fnStrToNumber): Chain;
export declare function collapseAll(chain: Chain, fnLevel: fnStrToNumber): Map<string, Node>;
export declare function add(chain: Chain, focusId: string, payload: JS.Payload): Map<string, Node>;
export declare function indent(chain: Chain, anchorId: string, focusId: string, offset: number): Map<string, Node>;
export declare function chunk(chain: Chain, tgtSize: number, fnPayload: (counter: number) => JS.Payload): Map<string, Node>;
export declare function collapse(chain: Chain, anchor: string, focus: string): Map<string, Node>;
