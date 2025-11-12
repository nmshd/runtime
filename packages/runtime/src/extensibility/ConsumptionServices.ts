import { Inject } from "@nmshd/typescript-ioc";
import {
    AttributesFacade,
    DraftsFacade,
    IdentityMetadataFacade,
    IncomingRequestsFacade,
    NotificationsFacade,
    OutgoingRequestsFacade,
    SettingsFacade
} from "./facades/consumption/index.js";

export class ConsumptionServices {
    public constructor(
        @Inject public readonly attributes: AttributesFacade,
        @Inject public readonly drafts: DraftsFacade,
        @Inject public readonly settings: SettingsFacade,
        @Inject public readonly incomingRequests: IncomingRequestsFacade,
        @Inject public readonly outgoingRequests: OutgoingRequestsFacade,
        @Inject public readonly notifications: NotificationsFacade,
        @Inject public readonly identityMetadata: IdentityMetadataFacade
    ) {}
}
