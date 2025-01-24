import { type } from "@js-soft/ts-serval";
import { AbstractStringJSON, IAbstractString } from "../AbstractString";
import { AbstractName } from "../strings/AbstractName";

export interface StateJSON extends AbstractStringJSON {
    "@type": "State";
}

export interface IState extends IAbstractString {}

@type("State")
export class State extends AbstractName implements IState {
    public static from(value: IState | Omit<StateJSON, "@type"> | string): State {
        return this.fromAny(value);
    }
}
