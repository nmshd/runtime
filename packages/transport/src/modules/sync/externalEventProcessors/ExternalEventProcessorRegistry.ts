import { TransportError } from "../../../core";
import { ExternalEventProcessorConstructor } from "./ExternalEventProcessor";
import { IdentityDeletionProcessChangedEventProcessor } from "./IdentityDeletionProcessChangedEventProcessor";
import { IdentityDeletionProcessStartedEventProcessor } from "./IdentityDeletionProcessStartedEventProcessor";
import { MessageDeliveredExternalEventProcessor } from "./MessageDeliveredExternalEventProcessor";
import { MessageReceivedExternalEventProcessor } from "./MessageReceivedExternalEventProcessor";
import { RelationshipReactivationCompletedExternalEventProcessor } from "./RelationshipReactivationCompletedExternalEventProcessor";
import { RelationshipReactivationRequestedExternalEventProcessor } from "./RelationshipReactivationRequestedExternalEventProcessor";
import { RelationshipStatusChangedExternalEventProcessor } from "./RelationshipStatusChangedExternalEventProcessor";

export class ExternalEventProcessorRegistry {
    private readonly processors = new Map<string, ExternalEventProcessorConstructor>();
    public constructor() {
        this.registerProcessor("MessageReceived", MessageReceivedExternalEventProcessor);
        this.registerProcessor("MessageDelivered", MessageDeliveredExternalEventProcessor);
        this.registerProcessor("RelationshipStatusChanged", RelationshipStatusChangedExternalEventProcessor);
        this.registerProcessor("RelationshipReactivationRequested", RelationshipReactivationRequestedExternalEventProcessor);
        this.registerProcessor("RelationshipReactivationCompleted", RelationshipReactivationCompletedExternalEventProcessor);
        this.registerProcessor("IdentityDeletionProcessStarted", IdentityDeletionProcessStartedEventProcessor);
        this.registerProcessor("IdentityDeletionProcessStatusChanged", IdentityDeletionProcessChangedEventProcessor);
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
