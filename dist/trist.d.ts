declare namespace Trist {
    type PayloadPropName = 'id' | 'trystup' | 'format';
    type NodePropName = 'id' | 'rlevel' | 'prev' | 'next' | 'PV' | 'NV' | 'payload';
    type fnStrToNumber = (s: string) => number;
    type fnStrToStr = (s: string) => string;
    namespace JS {
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
    interface Payload extends Immutable.Map<PayloadPropName, string> {
        toJS(): JS.Payload;
    }
    interface Node extends Immutable.Map<NodePropName, Payload | string | number> {
        toJS(): JS.Node;
    }
    type Chain = Immutable.Map<string, Node>;
    type IDList = Immutable.List<string>;
}
declare namespace Trist {
    function chainOps(chain: Chain): {
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
        ids: (id: string) => Immutable.List<string>;
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
    function chainify(payloads: JS.Payload[], fnLevel?: fnStrToNumber): Chain;
    function collapseAll(chain: Chain, fnLevel: fnStrToNumber): Immutable.Map<string, Node>;
    function add(chain: Chain, focusId: string, payload: JS.Payload): Immutable.Map<string, Node>;
    function indent(chain: Chain, anchorId: string, focusId: string, offset: number): Immutable.Map<string, Node>;
    function chunk(chain: Chain, tgtSize: number, fnPayload: (counter: number) => JS.Payload): Immutable.Map<string, Node>;
    function collapse(chain: Chain, anchor: string, focus: string): Immutable.Map<string, Node>;
}
