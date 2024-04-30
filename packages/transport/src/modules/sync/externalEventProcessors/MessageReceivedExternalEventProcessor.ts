import { serialize, validate } from "@js-soft/ts-serval";
import { CoreId, CoreSerializable } from "../../../core";
import { MessageReceivedEvent } from "../../../events";
import { Message } from "../../messages/local/Message";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

export class MessageReceivedExternalEventData extends CoreSerializable {
    @serialize()
    @validate()
    public id: string;
}

export class MessageReceivedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: BackboneExternalEvent): Promise<Message> {
        const newMessagePayload = MessageReceivedExternalEventData.fromAny(externalEvent.payload);
        const newMessage = await this.accountController.messages.loadPeerMessage(CoreId.from(newMessagePayload.id));

        this.eventBus.publish(new MessageReceivedEvent(this.ownAddress, newMessage));
        return newMessage;
    }
}
