import { MessageReceivedEvent } from "@nmshd/runtime";
import { MailReceivedEvent } from "../../events";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule";

export interface MessageReceivedModuleConfig extends AppRuntimeModuleConfiguration {}

export class MessageReceivedModule extends AppRuntimeModule<MessageReceivedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(MessageReceivedEvent, this.handleMessageReceived.bind(this));
    }

    private async handleMessageReceived(event: MessageReceivedEvent) {
        const services = await this.runtime.getServices(event.eventTargetAddress);
        const messageDVO = await services.dataViewExpander.expandMessageDTO(event.data);

        switch (messageDVO.type) {
            case "MailDVO":
                this.runtime.eventBus.publish(new MailReceivedEvent(event.eventTargetAddress, messageDVO));
                break;
            default:
                break;
        }
    }
}
