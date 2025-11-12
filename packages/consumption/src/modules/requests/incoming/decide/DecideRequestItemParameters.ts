import { AcceptRequestItemParametersJSON } from "./AcceptRequestItemParameters.js";
import { RejectRequestItemParametersJSON } from "./RejectRequestItemParameters.js";

export type DecideRequestItemParametersJSON = AcceptRequestItemParametersJSON | RejectRequestItemParametersJSON;

export function isDecideRequestItemParametersJSON(json: any): json is DecideRequestItemParametersJSON {
    return json.items === undefined && json.accept !== undefined;
}
