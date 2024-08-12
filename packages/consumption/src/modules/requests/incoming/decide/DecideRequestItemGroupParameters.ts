import { DecideRequestItemParametersJSON } from "./DecideRequestItemParameters";

export interface DecideRequestItemGroupParametersJSON {
    items: DecideRequestItemParametersJSON[];
}

export function isDecideRequestItemGroupParametersJSON(json: any): json is DecideRequestItemGroupParametersJSON {
    return json.items !== undefined && json.accept === undefined;
}
