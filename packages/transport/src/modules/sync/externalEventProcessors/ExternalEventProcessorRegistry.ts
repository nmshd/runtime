import { TransportError } from "../../../core";
import { ExternalEventProcessorConstructor } from "./ExternalEventProcessor";
import { MessageDeliveredExternalEventProcessor } from "./MessageDeliveredExternalEventProcessor";
import { MessageReceivedExternalEventProcessor } from "./MessageReceivedExternalEventProcessor";
import { RelationshipChangeCompletedExternalEventProcessor } from "./RelationshipChangeCompletedExternalEventProcessor";
import { RelationshipChangeCreatedExternalEventProcessor } from "./RelationshipChangeCreatedExternalEventProcessor";

export class ExternalEventProcessorRegistry {
    private readonly processors = new Map<string, ExternalEventProcessorConstructor>();
    public constructor() {
        this.registerProcessor("MessageReceived", MessageReceivedExternalEventProcessor);
        this.registerProcessor("MessageDelivered", MessageDeliveredExternalEventProcessor);
        this.registerProcessor("RelationshipChangeCreated", RelationshipChangeCreatedExternalEventProcessor);
        this.registerProcessor("RelationshipChangeCompleted", RelationshipChangeCompletedExternalEventProcessor);
        // TODO: IdentityDeletion relevante external Events implementieren
        // TODO: Timo bezüglich des Formats der Events fragen
        // TODO: interne Runtimeevents (auf die App lauscht) können Daten tragen oder nur als Ping dienen?
        //       - existierende Events verwenden eher weniger Daten und dienen eher als Ping
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
