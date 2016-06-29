declare module "trist" {
    import { Map, List, Iterable } from 'immutable';
    
    export type PayloadPropName = 'id' | 'trystup' | 'format';
    export type NodePropName = 'id' | 'rlevel' | 'prev' | 'next' | 'PV' | 'NV' | 'payload';
    export type fnStrToNumber = (s: string) => number;
    export type fnStrToStr = (s: string) => string;
    export namespace JS {
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
    export type Chain = Map<string, Node>;
    export type IDList = List<string>;
    export function chainOps(chain: Chain): {
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
    export function chainify(payloads: JS.Payload[], fnLevel?: fnStrToNumber): Chain;
    export function collapseAll(chain: Chain, fnLevel: fnStrToNumber): Map<string, Node>;
    export function add(chain: Chain, focusId: string, payload: JS.Payload): Map<string, Node>;
    export function indent(chain: Chain, anchorId: string, focusId: string, offset: number): Map<string, Node>;
    export function chunk(chain: Chain, tgtSize: number, fnPayload: (counter: number) => JS.Payload): Map<string, Node>;
    export function collapse(chain: Chain, anchor: string, focus: string): Map<string, Node>;
}
