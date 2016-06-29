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
