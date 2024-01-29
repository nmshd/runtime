import { ILogger } from "@js-soft/logging-abstractions";
import { EventBus } from "@js-soft/ts-utils";
import { CoreId, TransportError, TransportLoggerFactory } from "../../core";
import { MessageDeliveredEvent, MessageReceivedEvent, RelationshipChangedEvent } from "../../events";
import { MessageController } from "../messages/MessageController";
import { RelationshipsController } from "../relationships/RelationshipsController";
import { BackboneExternalEvent } from "./backbone/BackboneExternalEvent";
import { FinalizeSyncRunRequestExternalEventResult } from "./backbone/FinalizeSyncRun";
import { ChangedItems } from "./ChangedItems";
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
                        await this.applyMessageReceivedEvent(externalEvent);
                        break;
                    case "MessageDelivered":
                        await this.applyMessageDeliveredEvent(externalEvent);
                        break;
                    case "RelationshipChangeCreated":
                        await this.applyRelationshipChangeCreatedEvent(externalEvent);
                        break;
                    case "RelationshipChangeCompleted":
                        await this.applyRelationshipChangeCompletedEvent(externalEvent);
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

    private async applyRelationshipChangeCompletedEvent(externalEvent: BackboneExternalEvent) {
        const payload = externalEvent.payload as { changeId: string };
        const relationship = await this.relationshipsController.applyChangeById(payload.changeId);

        if (relationship) {
            this.eventBus.publish(new RelationshipChangedEvent(this.ownAddress, relationship));
            this.changedItems.addRelationship(relationship);
        }
    }

    private async applyRelationshipChangeCreatedEvent(externalEvent: BackboneExternalEvent) {
        const payload = externalEvent.payload as { changeId: string; relationshipId: string };
        const relationship = await this.relationshipsController.applyChangeById(payload.changeId);

        if (relationship) {
            this.eventBus.publish(new RelationshipChangedEvent(this.ownAddress, relationship));
            this.changedItems.addRelationship(relationship);
        }
    }

    private async applyMessageDeliveredEvent(externalEvent: BackboneExternalEvent) {
        const messageReceivedPayload = externalEvent.payload as { id: string };
        const updatedMessages = await this.messagesController.updateCache([messageReceivedPayload.id]);

        const deliveredMessage = updatedMessages[0];

        this.eventBus.publish(new MessageDeliveredEvent(this.ownAddress, deliveredMessage));
        this.changedItems.addMessage(deliveredMessage);
    }

    private async applyMessageReceivedEvent(externalEvent: BackboneExternalEvent) {
        const newMessagePayload = externalEvent.payload as { id: string };
        const newMessage = await this.messagesController.loadPeerMessage(CoreId.from(newMessagePayload.id));

        this.eventBus.publish(new MessageReceivedEvent(this.ownAddress, newMessage));
        this.changedItems.addMessage(newMessage);
    }
}
