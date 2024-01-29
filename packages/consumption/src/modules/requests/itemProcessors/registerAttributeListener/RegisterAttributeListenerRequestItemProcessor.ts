import { RegisterAttributeListenerAcceptResponseItem, RegisterAttributeListenerRequestItem, ResponseItemResult } from "@nmshd/content";
import { AcceptRequestItemParametersJSON } from "../../incoming/decide/AcceptRequestItemParameters";
import { GenericRequestItemProcessor } from "../GenericRequestItemProcessor";
import { LocalRequestInfo } from "../IRequestItemProcessor";

export class RegisterAttributeListenerRequestItemProcessor extends GenericRequestItemProcessor<RegisterAttributeListenerRequestItem> {
    public override async accept(
        requestItem: RegisterAttributeListenerRequestItem,
        _params: AcceptRequestItemParametersJSON,
        requestInfo: LocalRequestInfo
    ): Promise<RegisterAttributeListenerAcceptResponseItem> {
        const listener = await this.consumptionController.attributeListeners.createAttributeListener({
            peer: requestInfo.peer,
            query: requestItem.query
        });

        return RegisterAttributeListenerAcceptResponseItem.from({
            result: ResponseItemResult.Accepted,
            listenerId: listener.id.toString()
        });
    }
}
