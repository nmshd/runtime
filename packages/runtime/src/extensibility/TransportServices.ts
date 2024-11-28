import { Inject } from "@nmshd/typescript-ioc";
import {
    AccountFacade,
    ChallengesFacade,
    DevicesFacade,
    FilesFacade,
    IdentityDeletionProcessesFacade,
    MessagesFacade,
    PublicRelationshipTemplateReferencesFacade,
    RelationshipsFacade,
    RelationshipTemplatesFacade,
    TokensFacade
} from "./facades/transport";

export class TransportServices {
    public constructor(
        @Inject public readonly files: FilesFacade,
        @Inject public readonly messages: MessagesFacade,
        @Inject public readonly relationships: RelationshipsFacade,
        @Inject public readonly relationshipTemplates: RelationshipTemplatesFacade,
        @Inject public readonly tokens: TokensFacade,
        @Inject public readonly account: AccountFacade,
        @Inject public readonly devices: DevicesFacade,
        @Inject public readonly challenges: ChallengesFacade,
        @Inject public readonly identityDeletionProcesses: IdentityDeletionProcessesFacade,
        @Inject public readonly publicRelationshipTemplateReferences: PublicRelationshipTemplateReferencesFacade
    ) {}
}
