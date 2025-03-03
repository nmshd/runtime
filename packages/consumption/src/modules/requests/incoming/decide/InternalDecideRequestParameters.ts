import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { DecideRequestItemGroupParametersJSON } from "./DecideRequestItemGroupParameters";
import { DecideRequestItemParametersJSON } from "./DecideRequestItemParameters";

export interface InternalDecideRequestParametersJSON {
    requestId: string;
    items: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[];
    accept: boolean;
}

@type("InternalDecideRequestParameters")
export class InternalDecideRequestParameters extends Serializable {
    @serialize()
    @validate()
    public requestId: CoreId;

    @serialize()
    @validate()
    public items: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[];

    @serialize()
    @validate()
    public accept: boolean;

    public static from(value: InternalDecideRequestParametersJSON): InternalDecideRequestParameters {
        return this.fromAny(value);
    }
}
