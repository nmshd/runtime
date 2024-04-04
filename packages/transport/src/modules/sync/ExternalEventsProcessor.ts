import { ILogger } from "@js-soft/logging-abstractions";
import { EventBus } from "@js-soft/ts-utils";
import { TransportError, TransportLoggerFactory } from "../../core";
import { MessageController } from "../messages/MessageController";
import { RelationshipsController } from "../relationships/RelationshipsController";
import { BackboneExternalEvent } from "./backbone/BackboneExternalEvent";
import { FinalizeSyncRunRequestExternalEventResult } from "./backbone/FinalizeSyncRun";
import { ChangedItems } from "./ChangedItems";
import {
    MessageDeliveredEventProcessor,
    MessageReceivedEventProcessor,
    RelationshipChangeCompletedEventProcessor,
    RelationshipChangeCreatedEventProcessor
} from "./externalEventProcessors";
import { SyncProgressReporter, SyncProgressReporterStep, SyncStep } from "./SyncCallback";

export class ExternalEventsProcessor {
    private readonly log: ILogger;
    public readonly changedItems: ChangedItems = new ChangedItems();
    public readonly results: FinalizeSyncRunRequestExternalEventResult[] = [];
    private readonly syncStep: SyncProgressReporterStep;

    public constructor(
        private readonly messagesController: MessageController,
        private readonly relationshipsController: RelationshipsController,
        private readonly externalEvents: BackboneExternalEvent[],
        reporter: SyncProgressReporter,
        private readonly eventBus: EventBus,
        private readonly ownAddress: string
    ) {
        this.log = TransportLoggerFactory.getLogger(ExternalEventsProcessor);
        this.syncStep = reporter.createStep(SyncStep.ExternalEventsProcessing, externalEvents.length);
    }

    public async execute(): Promise<void> {
        for (const externalEvent of this.externalEvents) {
            try {
                switch (externalEvent.type) {
                    case "MessageReceived":
                        await new MessageReceivedEventProcessor(this.eventBus, this.changedItems, this.ownAddress, this.messagesController).execute(externalEvent);
                        break;
                    case "MessageDelivered":
                        await new MessageDeliveredEventProcessor(this.eventBus, this.changedItems, this.ownAddress, this.messagesController).execute(externalEvent);
                        break;
                    case "RelationshipChangeCreated":
                        await new RelationshipChangeCreatedEventProcessor(this.eventBus, this.changedItems, this.ownAddress, this.relationshipsController).execute(externalEvent);
                        break;
                    case "RelationshipChangeCompleted":
                        await new RelationshipChangeCompletedEventProcessor(this.eventBus, this.changedItems, this.ownAddress, this.relationshipsController).execute(externalEvent);
                        break;
                    default:
                        throw new TransportError(`'${externalEvent.type}' is not a supported external event type.`);
                }

                this.results.push({
                    externalEventId: externalEvent.id
                });
            } catch (e: any) {
                this.log.error("There was an error while trying to apply an external event: ", e);

                let errorCode;
                if (e.code) {
                    errorCode = e.code;
                } else if (e.message) {
                    errorCode = e.message;
                } else {
                    errorCode = JSON.stringify(e);
                }

                this.results.push({
                    externalEventId: externalEvent.id,
                    errorCode: errorCode
                });
            } finally {
                this.syncStep.progress();
            }
        }
    }
}
