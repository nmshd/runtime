import {
    AuthenticationRequestItem,
    ConsentRequestItem,
    CreateAttributeRequestItem,
    DeleteAttributeRequestItem,
    FormFieldRequestItem,
    ForwardedAttributeDeletedByPeerNotificationItem,
    OwnAttributeDeletedByOwnerNotificationItem,
    PeerAttributeSucceededNotificationItem,
    PeerRelationshipAttributeDeletedByPeerNotificationItem,
    ProposeAttributeRequestItem,
    ReadAttributeRequestItem,
    ShareAttributeRequestItem,
    TransferFileOwnershipRequestItem
} from "@nmshd/content";
import { CoreAddress, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import {
    AttributesController,
    CreateAttributeRequestItemProcessor,
    DeleteAttributeRequestItemProcessor,
    DraftsController,
    FormFieldRequestItemProcessor,
    ForwardedAttributeDeletedByPeerNotificationItemProcessor,
    GenericRequestItemProcessor,
    IdentityMetadataController,
    IncomingRequestsController,
    NotificationItemConstructor,
    NotificationItemProcessorConstructor,
    NotificationItemProcessorRegistry,
    NotificationsController,
    OutgoingRequestsController,
    OwnAttributeDeletedByOwnerNotificationItemProcessor,
    PeerAttributeSucceededNotificationItemProcessor,
    PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor,
    ProposeAttributeRequestItemProcessor,
    ReadAttributeRequestItemProcessor,
    RequestItemConstructor,
    RequestItemProcessorConstructor,
    RequestItemProcessorRegistry,
    SettingsController,
    ShareAttributeRequestItemProcessor,
    TransferFileOwnershipRequestItemProcessor
} from "../modules";
import { ConsumptionConfig } from "./ConsumptionConfig";

export class ConsumptionController {
    public constructor(
        public readonly transport: Transport,
        public readonly accountController: AccountController,
        public readonly consumptionConfig: ConsumptionConfig
    ) {}

    private _attributes: AttributesController;
    public get attributes(): AttributesController {
        return this._attributes;
    }

    private _drafts: DraftsController;
    public get drafts(): DraftsController {
        return this._drafts;
    }

    private _outgoingRequests: OutgoingRequestsController;
    public get outgoingRequests(): OutgoingRequestsController {
        return this._outgoingRequests;
    }

    private _incomingRequests: IncomingRequestsController;
    public get incomingRequests(): IncomingRequestsController {
        return this._incomingRequests;
    }

    private _settings: SettingsController;
    public get settings(): SettingsController {
        return this._settings;
    }

    private _notifications: NotificationsController;
    public get notifications(): NotificationsController {
        return this._notifications;
    }

    private _identityMetadata: IdentityMetadataController;
    public get identityMetadata(): IdentityMetadataController {
        return this._identityMetadata;
    }

    public async init(
        requestItemProcessorOverrides = new Map<RequestItemConstructor, RequestItemProcessorConstructor>(),
        notificationItemProcessorOverrides = new Map<NotificationItemConstructor, NotificationItemProcessorConstructor>()
    ): Promise<ConsumptionController> {
        this._attributes = await new AttributesController(
            this,
            this.transport.eventBus,
            this.accountController.identity,
            this.consumptionConfig.setDefaultOwnIdentityAttributes
        ).init();
        this._drafts = await new DraftsController(this).init();

        const requestItemProcessorRegistry = new RequestItemProcessorRegistry(this, this.getDefaultRequestItemProcessors());

        for (const [itemConstructor, processorConstructor] of requestItemProcessorOverrides) {
            requestItemProcessorRegistry.registerOrReplaceProcessor(itemConstructor, processorConstructor);
        }

        this._outgoingRequests = await new OutgoingRequestsController(
            await this.accountController.getSynchronizedCollection("Requests"),
            requestItemProcessorRegistry,
            this,
            this.transport.eventBus,
            this.accountController.identity,
            this.accountController.relationships
        ).init();
        this._incomingRequests = await new IncomingRequestsController(
            await this.accountController.getSynchronizedCollection("Requests"),
            requestItemProcessorRegistry,
            this,
            this.transport.eventBus,
            this.accountController.identity,
            this.accountController.relationships
        ).init();

        const notificationItemProcessorRegistry = new NotificationItemProcessorRegistry(this, this.getDefaultNotificationItemProcessors());

        for (const [itemConstructor, processorConstructor] of notificationItemProcessorOverrides) {
            notificationItemProcessorRegistry.registerOrReplaceProcessor(itemConstructor, processorConstructor);
        }

        this._notifications = await new NotificationsController(
            await this.accountController.getSynchronizedCollection("Notifications"),
            notificationItemProcessorRegistry,
            this,
            this.transport.eventBus,
            this.accountController.activeDevice
        ).init();

        this._identityMetadata = await new IdentityMetadataController(this).init();

        this._settings = await new SettingsController(this).init();
        return this;
    }

    private getDefaultRequestItemProcessors() {
        return new Map<RequestItemConstructor, RequestItemProcessorConstructor>([
            [ShareAttributeRequestItem, ShareAttributeRequestItemProcessor],
            [CreateAttributeRequestItem, CreateAttributeRequestItemProcessor],
            [DeleteAttributeRequestItem, DeleteAttributeRequestItemProcessor],
            [ReadAttributeRequestItem, ReadAttributeRequestItemProcessor],
            [ProposeAttributeRequestItem, ProposeAttributeRequestItemProcessor],
            [ConsentRequestItem, GenericRequestItemProcessor],
            [AuthenticationRequestItem, GenericRequestItemProcessor],
            [FormFieldRequestItem, FormFieldRequestItemProcessor],
            [TransferFileOwnershipRequestItem, TransferFileOwnershipRequestItemProcessor]
        ]);
    }

    private getDefaultNotificationItemProcessors() {
        return new Map<NotificationItemConstructor, NotificationItemProcessorConstructor>([
            [PeerAttributeSucceededNotificationItem, PeerAttributeSucceededNotificationItemProcessor],
            [OwnAttributeDeletedByOwnerNotificationItem, OwnAttributeDeletedByOwnerNotificationItemProcessor],
            [PeerRelationshipAttributeDeletedByPeerNotificationItem, PeerRelationshipAttributeDeletedByPeerNotificationItemProcessor],
            [ForwardedAttributeDeletedByPeerNotificationItem, ForwardedAttributeDeletedByPeerNotificationItemProcessor]
        ]);
    }

    public async cleanupDataOfDecomposedRelationship(peer: CoreAddress, relationshipId: CoreId): Promise<void> {
        await this.attributes.deleteAttributesExchangedWithPeer(peer);
        await this.outgoingRequests.deleteRequestsToPeer(peer);
        await this.incomingRequests.deleteRequestsFromPeer(peer);
        await this.settings.deleteSettingsForRelationship(relationshipId);
        await this.notifications.deleteNotificationsExchangedWithPeer(peer);
        await this.identityMetadata.deleteIdentityMetadataReferencedWithPeer(peer);
    }
}
