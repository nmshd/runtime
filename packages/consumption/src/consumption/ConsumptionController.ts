import {
    AuthenticationRequestItem,
    ConsentRequestItem,
    CreateAttributeRequestItem,
    FreeTextRequestItem,
    OwnSharedAttributeDeletedByOwnerNotificationItem,
    PeerSharedAttributeSucceededNotificationItem,
    ProposeAttributeRequestItem,
    ReadAttributeRequestItem,
    RegisterAttributeListenerRequestItem,
    ShareAttributeRequestItem
} from "@nmshd/content";
import { AccountController, Transport } from "@nmshd/transport";
import {
    AttributeListenersController,
    AttributesController,
    CreateAttributeRequestItemProcessor,
    DraftsController,
    FreeTextRequestItemProcessor,
    GenericRequestItemProcessor,
    IncomingRequestsController,
    NotificationItemConstructor,
    NotificationItemProcessorConstructor,
    NotificationItemProcessorRegistry,
    NotificationsController,
    OutgoingRequestsController,
    PeerSharedAttributeSucceededNotificationItemProcessor,
    ProposeAttributeRequestItemProcessor,
    ReadAttributeRequestItemProcessor,
    RegisterAttributeListenerRequestItemProcessor,
    RequestItemConstructor,
    RequestItemProcessorConstructor,
    RequestItemProcessorRegistry,
    SettingsController,
    ShareAttributeRequestItemProcessor
} from "../modules";
import { OwnSharedAttributeDeletedByOwnerNotificationItemProcessor } from "../modules/notifications/itemProcessors/OwnSharedAttributeDeletedByOwnerNotificationItemProcessor";

export class ConsumptionController {
    public constructor(
        public readonly transport: Transport,
        public readonly accountController: AccountController
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

    private _attributeListeners: AttributeListenersController;
    public get attributeListeners(): AttributeListenersController {
        return this._attributeListeners;
    }

    private _notifications: NotificationsController;
    public get notifications(): NotificationsController {
        return this._notifications;
    }

    public async init(
        requestItemProcessorOverrides = new Map<RequestItemConstructor, RequestItemProcessorConstructor>(),
        notificationItemProcessorOverrides = new Map<NotificationItemConstructor, NotificationItemProcessorConstructor>()
    ): Promise<ConsumptionController> {
        this._attributes = await new AttributesController(this, this.transport.eventBus, this.accountController.identity).init();
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
            this.accountController.identity
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

        this._settings = await new SettingsController(this).init();
        this._attributeListeners = await new AttributeListenersController(this, this.transport.eventBus, this.accountController.identity).init();
        return this;
    }

    private getDefaultRequestItemProcessors() {
        return new Map<RequestItemConstructor, RequestItemProcessorConstructor>([
            [ShareAttributeRequestItem, ShareAttributeRequestItemProcessor],
            [CreateAttributeRequestItem, CreateAttributeRequestItemProcessor],
            [ReadAttributeRequestItem, ReadAttributeRequestItemProcessor],
            [ProposeAttributeRequestItem, ProposeAttributeRequestItemProcessor],
            [ConsentRequestItem, GenericRequestItemProcessor],
            [AuthenticationRequestItem, GenericRequestItemProcessor],
            [RegisterAttributeListenerRequestItem, RegisterAttributeListenerRequestItemProcessor],
            [FreeTextRequestItem, FreeTextRequestItemProcessor]
        ]);
    }

    private getDefaultNotificationItemProcessors() {
        return new Map<NotificationItemConstructor, NotificationItemProcessorConstructor>([
            [PeerSharedAttributeSucceededNotificationItem, PeerSharedAttributeSucceededNotificationItemProcessor],
            [OwnSharedAttributeDeletedByOwnerNotificationItem, OwnSharedAttributeDeletedByOwnerNotificationItemProcessor]
        ]);
    }
}
