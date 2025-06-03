import { TransportError } from "../../../core";
import { ExternalEventProcessorConstructor } from "./ExternalEventProcessor";
import { FileOwnershipLockedExternalEventProcessor } from "./FileOwnershipLockedExternalEventProcessor";
import { IdentityDeletionProcessStartedExternalEventProcessor } from "./IdentityDeletionProcessStartedExternalEventProcessor";
import { IdentityDeletionProcessStatusChangedExternalEventProcessor } from "./IdentityDeletionProcessStatusChangedExternalEventProcessor";
import { MessageDeliveredExternalEventProcessor } from "./MessageDeliveredExternalEventProcessor";
import { MessageReceivedExternalEventProcessor } from "./MessageReceivedExternalEventProcessor";
import { PeerDeletedExternalEventProcessor } from "./PeerDeletedExternalEventProcessor";
import { PeerDeletionCancelledExternalEventProcessor } from "./PeerDeletionCancelledExternalEventProcessor";
import { PeerToBeDeletedExternalEventProcessor } from "./PeerToBeDeletedExternalEventProcessor";
import { RelationshipReactivationCompletedExternalEventProcessor } from "./RelationshipReactivationCompletedExternalEventProcessor";
import { RelationshipReactivationRequestedExternalEventProcessor } from "./RelationshipReactivationRequestedExternalEventProcessor";
import { RelationshipStatusChangedExternalEventProcessor } from "./RelationshipStatusChangedExternalEventProcessor";
import { RelationshipTemplateAllocationsExhaustedExternalEventProcessor } from "./RelationshipTemplateAllocationsExhaustedProcessor";

export class ExternalEventProcessorRegistry {
    private readonly processors = new Map<string, ExternalEventProcessorConstructor>();
    public constructor() {
        this.registerProcessor("MessageReceived", MessageReceivedExternalEventProcessor);
        this.registerProcessor("MessageDelivered", MessageDeliveredExternalEventProcessor);
        this.registerProcessor("RelationshipStatusChanged", RelationshipStatusChangedExternalEventProcessor);
        this.registerProcessor("RelationshipReactivationRequested", RelationshipReactivationRequestedExternalEventProcessor);
        this.registerProcessor("RelationshipReactivationCompleted", RelationshipReactivationCompletedExternalEventProcessor);
        this.registerProcessor("IdentityDeletionProcessStarted", IdentityDeletionProcessStartedExternalEventProcessor);
        this.registerProcessor("IdentityDeletionProcessStatusChanged", IdentityDeletionProcessStatusChangedExternalEventProcessor);
        this.registerProcessor("PeerDeleted", PeerDeletedExternalEventProcessor);
        this.registerProcessor("PeerDeletionCancelled", PeerDeletionCancelledExternalEventProcessor);
        this.registerProcessor("PeerToBeDeleted", PeerToBeDeletedExternalEventProcessor);
        this.registerProcessor("RelationshipTemplateAllocationsExhausted", RelationshipTemplateAllocationsExhaustedExternalEventProcessor);
        this.registerProcessor("FileOwnershipLocked", FileOwnershipLockedExternalEventProcessor);
    }

    public registerProcessor(externalEventName: string, externalEventProcessor: ExternalEventProcessorConstructor): void {
        if (this.processors.has(externalEventName)) {
            throw new TransportError(`There is already a externalEventProcessor registered for '${externalEventName}'. Use 'replaceProcessorForType' if you want to replace it.`);
        }
        this.processors.set(externalEventName, externalEventProcessor);
    }

    public registerOrReplaceProcessor(externalEventName: string, externalEventProcessor: ExternalEventProcessorConstructor): void {
        this.processors.set(externalEventName, externalEventProcessor);
    }

    public getProcessorForItem(externalEventName: string): ExternalEventProcessorConstructor {
        const externalEventProcessor = this.processors.get(externalEventName);
        if (!externalEventProcessor) {
            throw new TransportError(`There was no processor registered for '${externalEventName}'.`);
        }
        return externalEventProcessor;
    }
}
