import { DecideRequestItemGroupParametersJSON } from "./DecideRequestItemGroupParameters";
import { DecideRequestItemParametersJSON } from "./DecideRequestItemParameters";

export interface DecideRequestParametersJSON {
    requestId: string;
    items: (DecideRequestItemParametersJSON | DecideRequestItemGroupParametersJSON)[];
    decidedByAutomation?: true;
}
