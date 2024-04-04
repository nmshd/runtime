import { EventBus } from "@js-soft/ts-utils";
import { BackboneExternalEvent } from "../backbone/BackboneExternalEvent";
import { ChangedItems } from "../ChangedItems";

export abstract class ExternalEventProcessor {
    public constructor(
        protected readonly eventBus: EventBus,
        protected readonly changedItems: ChangedItems,
        protected readonly ownAddress: string
    ) {}
    public abstract execute(externalEvent: BackboneExternalEvent): Promise<void>;
}
