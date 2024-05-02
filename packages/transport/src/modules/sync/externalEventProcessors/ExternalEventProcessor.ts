import { EventBus } from "@js-soft/ts-utils";
import { AccountController } from "../../accounts/AccountController";
import { Message } from "../../messages/local/Message";
import { Relationship } from "../../relationships/local/Relationship";
import { ExternalEvent } from "../data/ExternalEvent";

export type ExternalEventProcessorConstructor = new (eventBus: EventBus, accountController: AccountController) => ExternalEventProcessor;

export abstract class ExternalEventProcessor {
    public constructor(
        protected readonly eventBus: EventBus,
        protected readonly accountController: AccountController
    ) {}
    public abstract execute(externalEvent: ExternalEvent): Promise<Message | Relationship | undefined>;
    protected get ownAddress(): string {
        return this.accountController.identity.address.toString();
    }
}
