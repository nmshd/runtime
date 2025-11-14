import { type } from "@js-soft/ts-serval";
import { AbstractString, AbstractStringJSON, IAbstractString } from "../AbstractString.js";

export interface StateJSON extends AbstractStringJSON {
    "@type": "State";
}

export interface IState extends IAbstractString {}

@type("State")
export class State extends AbstractString implements IState {
    public static from(value: IState | Omit<StateJSON, "@type"> | string): State {
        return this.fromAny(value);
    }
}
