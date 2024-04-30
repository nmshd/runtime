import { EventBus } from "@js-soft/ts-utils";
import { CoreSerializable } from "../../../core";
import { AccountController } from "../../accounts/AccountController";
import { Message } from "../../messages/local/Message";
import { Relationship } from "../../relationships/local/Relationship";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";

export type ExternalEventProcessorConstructor = new (eventBus: EventBus, accountController: AccountController) => ExternalEventProcessor;
export type ExternalEventProcessorDataConstructor = new (...any: any[]) => CoreSerializable;

export abstract class ExternalEventProcessor {
    public constructor(
        protected readonly eventBus: EventBus,
        protected readonly accountController: AccountController
    ) {}
    public abstract execute(externalEvent: BackboneExternalEvent): Promise<Message | Relationship | undefined>;
    protected get ownAddress(): string {
        return this.accountController.identity.address.toString();
    }
}
