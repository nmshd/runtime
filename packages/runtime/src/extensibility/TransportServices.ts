import { Inject } from "@nmshd/typescript-ioc";
import {
    AccountFacade,
    AnnouncementsFacade,
    ChallengesFacade,
    DevicesFacade,
    FilesFacade,
    IdentityDeletionProcessesFacade,
    IdentityRecoveryKitsFacade,
    MessagesFacade,
    PublicRelationshipTemplateReferencesFacade,
    RelationshipsFacade,
    RelationshipTemplatesFacade,
    TokensFacade
} from "./facades/transport";

export class TransportServices {
    public constructor(
        @Inject public readonly account: AccountFacade,
        @Inject public readonly announcements: AnnouncementsFacade,
        @Inject public readonly challenges: ChallengesFacade,
        @Inject public readonly devices: DevicesFacade,
        @Inject public readonly files: FilesFacade,
        @Inject public readonly identityDeletionProcesses: IdentityDeletionProcessesFacade,
        @Inject public readonly identityRecoveryKits: IdentityRecoveryKitsFacade,
        @Inject public readonly messages: MessagesFacade,
        @Inject public readonly publicRelationshipTemplateReferences: PublicRelationshipTemplateReferencesFacade,
        @Inject public readonly relationships: RelationshipsFacade,
        @Inject public readonly relationshipTemplates: RelationshipTemplatesFacade,
        @Inject public readonly tokens: TokensFacade
    ) {}
}
