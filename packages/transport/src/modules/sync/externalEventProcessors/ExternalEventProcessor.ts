import { EventBus } from "@js-soft/ts-utils";
import { AccountController } from "../../accounts/AccountController.js";
import { IdentityDeletionProcess } from "../../accounts/data/IdentityDeletionProcess.js";
import { File } from "../../files/local/File.js";
import { Message } from "../../messages/local/Message.js";
import { Relationship } from "../../relationships/local/Relationship.js";
import { ExternalEvent } from "../data/ExternalEvent.js";

export type ExternalEventProcessorConstructor = new (eventBus: EventBus, accountController: AccountController) => ExternalEventProcessor;

export abstract class ExternalEventProcessor {
    public constructor(
        protected readonly eventBus: EventBus,
        protected readonly accountController: AccountController
    ) {}

    public abstract execute(externalEvent: ExternalEvent): Promise<Message | Relationship | IdentityDeletionProcess | File | undefined>;
    protected get ownAddress(): string {
        return this.accountController.identity.address.toString();
    }
}
