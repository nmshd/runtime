import { TransportError } from "../../../core/index.js";
import { ExternalEventProcessorConstructor } from "./ExternalEventProcessor.js";
import { FileOwnershipClaimedExternalEventProcessor } from "./FileOwnershipClaimedExternalEventProcessor.js";
import { FileOwnershipLockedExternalEventProcessor } from "./FileOwnershipLockedExternalEventProcessor.js";
import { IdentityDeletionProcessStartedExternalEventProcessor } from "./IdentityDeletionProcessStartedExternalEventProcessor.js";
import { IdentityDeletionProcessStatusChangedExternalEventProcessor } from "./IdentityDeletionProcessStatusChangedExternalEventProcessor.js";
import { MessageDeliveredExternalEventProcessor } from "./MessageDeliveredExternalEventProcessor.js";
import { MessageReceivedExternalEventProcessor } from "./MessageReceivedExternalEventProcessor.js";
import { PeerDeletedExternalEventProcessor } from "./PeerDeletedExternalEventProcessor.js";
import { PeerDeletionCancelledExternalEventProcessor } from "./PeerDeletionCancelledExternalEventProcessor.js";
import { PeerToBeDeletedExternalEventProcessor } from "./PeerToBeDeletedExternalEventProcessor.js";
import { RelationshipReactivationCompletedExternalEventProcessor } from "./RelationshipReactivationCompletedExternalEventProcessor.js";
import { RelationshipReactivationRequestedExternalEventProcessor } from "./RelationshipReactivationRequestedExternalEventProcessor.js";
import { RelationshipStatusChangedExternalEventProcessor } from "./RelationshipStatusChangedExternalEventProcessor.js";
import { RelationshipTemplateAllocationsExhaustedExternalEventProcessor } from "./RelationshipTemplateAllocationsExhaustedProcessor.js";

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
        this.registerProcessor("FileOwnershipClaimed", FileOwnershipClaimedExternalEventProcessor);
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
