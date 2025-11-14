import { DecideRequestItemGroupParametersJSON } from "./DecideRequestItemGroupParameters.js";
import { DecideRequestItemParametersJSON } from "./DecideRequestItemParameters.js";

export interface DecideRequestParametersJSON {
    requestId: string;
    items: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[];
    decidedByAutomation?: true;
}
