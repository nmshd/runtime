import { EventBus, EventHandler, SubscriptionTarget } from "@js-soft/ts-utils";
import * as consumption from "@nmshd/consumption";
import * as transport from "@nmshd/transport";
import { AttributeListenerMapper, AttributeMapper, IdentityDeletionProcessMapper, MessageMapper, RelationshipMapper, RelationshipTemplateMapper, RequestMapper } from "../useCases";
import {
    AttributeCreatedEvent,
    AttributeDeletedEvent,
    AttributeListenerCreatedEvent,
    IncomingRequestReceivedEvent,
    IncomingRequestStatusChangedEvent,
    OutgoingRequestCreatedAndCompletedEvent,
    OutgoingRequestCreatedEvent,
    OutgoingRequestFromRelationshipCreationCreatedAndCompletedEvent,
    OutgoingRequestStatusChangedEvent,
    OwnSharedAttributeDeletedByOwnerEvent,
    OwnSharedAttributeSucceededEvent,
    PeerSharedAttributeDeletedByPeerEvent,
    PeerSharedAttributeSucceededEvent,
    RepositoryAttributeSucceededEvent,
    ThirdPartyOwnedRelationshipAttributeDeletedByPeerEvent,
    ThirdPartyOwnedRelationshipAttributeSucceededEvent,
    ThirdPartyRelationshipAttributeDeletedByPeerEvent,
    ThirdPartyRelationshipAttributeSucceededEvent
} from "./consumption";
import {
    DatawalletSynchronizedEvent,
    IdentityDeletionProcessStatusChangedEvent,
    MessageDeliveredEvent,
    MessageReceivedEvent,
    MessageSentEvent,
    MessageWasReadAtChangedEvent,
    PeerDeletedEvent,
    PeerDeletionCancelledEvent,
    PeerRelationshipTemplateLoadedEvent,
    PeerToBeDeletedEvent,
    RelationshipChangedEvent,
    RelationshipDecomposedBySelfEvent,
    RelationshipReactivationCompletedEvent,
    RelationshipReactivationRequestedEvent,
    RelationshipTemplateAllocationsExhaustedEvent
} from "./transport";

export class EventProxy {
    private readonly subscriptionIds: number[] = [];

    public constructor(
        private readonly targetEventBus: EventBus,
        private readonly sourceEventBus: EventBus
    ) {}

    public start(): this {
        if (this.subscriptionIds.length > 0) throw new Error("EventProxy is already started");

        this.proxyConsumptionEvents();
        this.proxyTransportEvents();
        return this;
    }

    private proxyTransportEvents() {
        this.subscribeToSourceEvent(transport.MessageDeliveredEvent, (event) => {
            this.targetEventBus.publish(new MessageDeliveredEvent(event.eventTargetAddress, MessageMapper.toMessageDTO(event.data)));
        });

        this.subscribeToSourceEvent(transport.MessageReceivedEvent, (event) => {
            this.targetEventBus.publish(new MessageReceivedEvent(event.eventTargetAddress, MessageMapper.toMessageDTO(event.data)));
        });

        this.subscribeToSourceEvent(transport.MessageSentEvent, (event) => {
            this.targetEventBus.publish(new MessageSentEvent(event.eventTargetAddress, MessageMapper.toMessageDTO(event.data)));
        });

        this.subscribeToSourceEvent(transport.MessageWasReadAtChangedEvent, (event) => {
            this.targetEventBus.publish(new MessageWasReadAtChangedEvent(event.eventTargetAddress, MessageMapper.toMessageDTO(event.data)));
        });

        this.subscribeToSourceEvent(transport.PeerRelationshipTemplateLoadedEvent, (event) => {
            this.targetEventBus.publish(new PeerRelationshipTemplateLoadedEvent(event.eventTargetAddress, RelationshipTemplateMapper.toRelationshipTemplateDTO(event.data)));
        });

        this.subscribeToSourceEvent(transport.RelationshipChangedEvent, (event) => {
            this.targetEventBus.publish(new RelationshipChangedEvent(event.eventTargetAddress, RelationshipMapper.toRelationshipDTO(event.data)));
        });

        this.subscribeToSourceEvent(transport.RelationshipReactivationRequestedEvent, (event) => {
            this.targetEventBus.publish(new RelationshipReactivationRequestedEvent(event.eventTargetAddress, RelationshipMapper.toRelationshipDTO(event.data)));
        });

        this.subscribeToSourceEvent(transport.RelationshipReactivationCompletedEvent, (event) => {
            this.targetEventBus.publish(new RelationshipReactivationCompletedEvent(event.eventTargetAddress, RelationshipMapper.toRelationshipDTO(event.data)));
        });

        this.subscribeToSourceEvent(transport.RelationshipDecomposedBySelfEvent, (event) => {
            this.targetEventBus.publish(new RelationshipDecomposedBySelfEvent(event.eventTargetAddress, { relationshipId: event.data.relationshipId.toString() }));
        });

        this.subscribeToSourceEvent(transport.IdentityDeletionProcessStatusChangedEvent, (event) => {
            this.targetEventBus.publish(
                new IdentityDeletionProcessStatusChangedEvent(
                    event.eventTargetAddress,
                    event.data ? IdentityDeletionProcessMapper.toIdentityDeletionProcessDTO(event.data) : undefined
                )
            );
        });

        this.subscribeToSourceEvent(transport.PeerDeletedEvent, (event) => {
            this.targetEventBus.publish(new PeerDeletedEvent(event.eventTargetAddress, RelationshipMapper.toRelationshipDTO(event.data)));
        });

        this.subscribeToSourceEvent(transport.PeerToBeDeletedEvent, (event) => {
            this.targetEventBus.publish(new PeerToBeDeletedEvent(event.eventTargetAddress, RelationshipMapper.toRelationshipDTO(event.data)));
        });

        this.subscribeToSourceEvent(transport.PeerDeletionCancelledEvent, (event) => {
            this.targetEventBus.publish(new PeerDeletionCancelledEvent(event.eventTargetAddress, RelationshipMapper.toRelationshipDTO(event.data)));
        });

        this.subscribeToSourceEvent(transport.DatawalletSynchronizedEvent, (event) => {
            this.targetEventBus.publish(new DatawalletSynchronizedEvent(event.eventTargetAddress));
        });

        this.subscribeToSourceEvent(transport.RelationshipTemplateAllocationsExhaustedEvent, (event) => {
            this.targetEventBus.publish(
                new RelationshipTemplateAllocationsExhaustedEvent(event.eventTargetAddress, RelationshipTemplateMapper.toRelationshipTemplateDTO(event.data))
            );
        });
    }

    private proxyConsumptionEvents() {
        this.subscribeToSourceEvent(consumption.AttributeCreatedEvent, (event) => {
            this.targetEventBus.publish(new AttributeCreatedEvent(event.eventTargetAddress, AttributeMapper.toAttributeDTO(event.data)));
        });

        this.subscribeToSourceEvent(consumption.AttributeDeletedEvent, (event) => {
            this.targetEventBus.publish(new AttributeDeletedEvent(event.eventTargetAddress, AttributeMapper.toAttributeDTO(event.data)));
        });

        this.subscribeToSourceEvent(consumption.OwnSharedAttributeDeletedByOwnerEvent, (event) => {
            this.targetEventBus.publish(new OwnSharedAttributeDeletedByOwnerEvent(event.eventTargetAddress, AttributeMapper.toAttributeDTO(event.data)));
        });

        this.subscribeToSourceEvent(consumption.PeerSharedAttributeDeletedByPeerEvent, (event) => {
            this.targetEventBus.publish(new PeerSharedAttributeDeletedByPeerEvent(event.eventTargetAddress, AttributeMapper.toAttributeDTO(event.data)));
        });

        this.subscribeToSourceEvent(consumption.ThirdPartyRelationshipAttributeDeletedByPeerEvent, (event) => {
            this.targetEventBus.publish(new ThirdPartyRelationshipAttributeDeletedByPeerEvent(event.eventTargetAddress, AttributeMapper.toAttributeDTO(event.data)));
            this.targetEventBus.publish(new ThirdPartyOwnedRelationshipAttributeDeletedByPeerEvent(event.eventTargetAddress, AttributeMapper.toAttributeDTO(event.data)));
        });

        this.subscribeToSourceEvent(consumption.OwnSharedAttributeSucceededEvent, (event) => {
            this.targetEventBus.publish(
                new OwnSharedAttributeSucceededEvent(event.eventTargetAddress, {
                    predecessor: AttributeMapper.toAttributeDTO(event.data.predecessor),
                    successor: AttributeMapper.toAttributeDTO(event.data.successor)
                })
            );
        });

        this.subscribeToSourceEvent(consumption.PeerSharedAttributeSucceededEvent, (event) => {
            this.targetEventBus.publish(
                new PeerSharedAttributeSucceededEvent(event.eventTargetAddress, {
                    predecessor: AttributeMapper.toAttributeDTO(event.data.predecessor),
                    successor: AttributeMapper.toAttributeDTO(event.data.successor)
                })
            );
        });

        this.subscribeToSourceEvent(consumption.ThirdPartyRelationshipAttributeSucceededEvent, (event) => {
            this.targetEventBus.publish(
                new ThirdPartyRelationshipAttributeSucceededEvent(event.eventTargetAddress, {
                    predecessor: AttributeMapper.toAttributeDTO(event.data.predecessor),
                    successor: AttributeMapper.toAttributeDTO(event.data.successor)
                })
            );
            this.targetEventBus.publish(
                new ThirdPartyOwnedRelationshipAttributeSucceededEvent(event.eventTargetAddress, {
                    predecessor: AttributeMapper.toAttributeDTO(event.data.predecessor),
                    successor: AttributeMapper.toAttributeDTO(event.data.successor)
                })
            );
        });

        this.subscribeToSourceEvent(consumption.RepositoryAttributeSucceededEvent, (event) => {
            this.targetEventBus.publish(
                new RepositoryAttributeSucceededEvent(event.eventTargetAddress, {
                    predecessor: AttributeMapper.toAttributeDTO(event.data.predecessor),
                    successor: AttributeMapper.toAttributeDTO(event.data.successor)
                })
            );
        });

        this.subscribeToSourceEvent(consumption.IncomingRequestReceivedEvent, (event) => {
            this.targetEventBus.publish(new IncomingRequestReceivedEvent(event.eventTargetAddress, RequestMapper.toLocalRequestDTO(event.data)));
        });

        this.subscribeToSourceEvent(consumption.IncomingRequestStatusChangedEvent, (event) => {
            this.targetEventBus.publish(
                new IncomingRequestStatusChangedEvent(event.eventTargetAddress, {
                    request: RequestMapper.toLocalRequestDTO(event.data.request),
                    oldStatus: event.data.oldStatus,
                    newStatus: event.data.newStatus
                })
            );
        });

        this.subscribeToSourceEvent(consumption.OutgoingRequestCreatedEvent, (event) => {
            this.targetEventBus.publish(new OutgoingRequestCreatedEvent(event.eventTargetAddress, RequestMapper.toLocalRequestDTO(event.data)));
        });

        this.subscribeToSourceEvent(consumption.OutgoingRequestCreatedAndCompletedEvent, (event) => {
            const mappedRequest = RequestMapper.toLocalRequestDTO(event.data);

            this.targetEventBus.publish(new OutgoingRequestCreatedAndCompletedEvent(event.eventTargetAddress, mappedRequest));

            if (event.data.response?.source?.type === "Relationship") {
                this.targetEventBus.publish(new OutgoingRequestFromRelationshipCreationCreatedAndCompletedEvent(event.eventTargetAddress, mappedRequest));
            }
        });

        this.subscribeToSourceEvent(consumption.OutgoingRequestStatusChangedEvent, (event) => {
            this.targetEventBus.publish(
                new OutgoingRequestStatusChangedEvent(event.eventTargetAddress, {
                    request: RequestMapper.toLocalRequestDTO(event.data.request),
                    oldStatus: event.data.oldStatus,
                    newStatus: event.data.newStatus
                })
            );
        });

        this.subscribeToSourceEvent(consumption.AttributeListenerCreatedEvent, (event) => {
            this.targetEventBus.publish(new AttributeListenerCreatedEvent(event.eventTargetAddress, AttributeListenerMapper.toAttributeListenerDTO(event.data)));
        });
    }

    private subscribeToSourceEvent<TEvent = any>(subscriptionTarget: SubscriptionTarget<TEvent>, handler: EventHandler<TEvent>) {
        const subscriptionId = this.sourceEventBus.subscribe(subscriptionTarget, handler);
        this.subscriptionIds.push(subscriptionId);
    }

    public stop(): void {
        this.subscriptionIds.forEach((id) => this.sourceEventBus.unsubscribe(id));
    }
}
