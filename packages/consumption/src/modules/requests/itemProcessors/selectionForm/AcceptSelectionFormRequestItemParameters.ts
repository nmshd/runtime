import { Serializable, serialize, type, validate } from "@js-soft/ts-serval";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";

export interface AcceptSelectionFormRequestItemParametersJSON extends AcceptRequestItemParametersJSON {
    options: string[];
}

@type("AcceptSelectionFormRequestItemParameters")
export class AcceptSelectionFormRequestItemParameters extends Serializable {
    @serialize({ type: String })
    @validate()
    public options: string[];

    public static from(value: AcceptSelectionFormRequestItemParametersJSON): AcceptSelectionFormRequestItemParameters {
        return this.fromAny(value);
    }
}
