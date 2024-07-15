import { AcceptRequestItemParametersJSON } from "./AcceptRequestItemParameters";
import { RejectRequestItemParametersJSON } from "./RejectRequestItemParameters";

export type DecideRequestItemParametersJSON = AcceptRequestItemParametersJSON | RejectRequestItemParametersJSON;

export function isDecideRequestItemParametersJSON(json: any): json is DecideRequestItemParametersJSON {
    return json.items === undefined && json.accept !== undefined;
}
