import { EventBus } from "@js-soft/ts-utils";
import { AccountController } from "../../accounts/AccountController";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ChangedItems } from "../ChangedItems";

export type ExternalEventProcessorConstructor = new (eventBus: EventBus, changedItems: ChangedItems, accountController: AccountController) => ExternalEventProcessor;

export abstract class ExternalEventProcessor {
    public constructor(
        protected readonly eventBus: EventBus,
        protected readonly changedItems: ChangedItems,
        protected readonly accountController: AccountController
    ) {}
    public abstract execute(externalEvent: BackboneExternalEvent): Promise<void>;
}
