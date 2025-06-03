import { Serializable, serialize, validate } from "@js-soft/ts-serval";
import { CoreId } from "@nmshd/core-types";
import { RelationshipTemplateAllocationsExhaustedEvent } from "../../../events";
import { ExternalEvent } from "../data/ExternalEvent";
import { ExternalEventProcessor } from "./ExternalEventProcessor";

class RelationshipTemplateAllocationsExhaustedExternalEventData extends Serializable {
    @serialize()
    @validate()
    public relationshipTemplateId: CoreId;
}

export class RelationshipTemplateAllocationsExhaustedExternalEventProcessor extends ExternalEventProcessor {
    public override async execute(externalEvent: ExternalEvent): Promise<undefined> {
        const payload = RelationshipTemplateAllocationsExhaustedExternalEventData.fromAny(externalEvent.payload);

        const template = await this.accountController.relationshipTemplates.getRelationshipTemplate(payload.relationshipTemplateId);
        if (!template) return;

        this.eventBus.publish(new RelationshipTemplateAllocationsExhaustedEvent(this.ownAddress, template));
    }
}
