import { type } from "@js-soft/ts-serval";
import { IState, State, StateJSON } from "../address/index.js";

export interface BirthStateJSON extends Omit<StateJSON, "@type"> {
    "@type": "BirthState";
}

export interface IBirthState extends IState {}

@type("BirthState")
export class BirthState extends State implements IBirthState {
    public static override from(value: IBirthState | Omit<BirthStateJSON, "@type"> | string): BirthState {
        return this.fromAny(value);
    }

    public override toJSON(verbose?: boolean | undefined, serializeAsString?: boolean | undefined): BirthStateJSON {
        return super.toJSON(verbose, serializeAsString) as BirthStateJSON;
    }
}
