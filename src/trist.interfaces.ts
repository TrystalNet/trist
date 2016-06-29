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
