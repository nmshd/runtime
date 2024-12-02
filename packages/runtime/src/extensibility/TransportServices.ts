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
    TagsFacade,
    TokensFacade
} from "./facades/transport";

export class TransportServices {
    public constructor(
        @Inject public readonly account: AccountFacade,
        @Inject public readonly challenges: ChallengesFacade,
        @Inject public readonly devices: DevicesFacade,
        @Inject public readonly files: FilesFacade,
        @Inject public readonly identityDeletionProcesses: IdentityDeletionProcessesFacade,
        @Inject public readonly messages: MessagesFacade,
        @Inject public readonly publicRelationshipTemplateReferences: PublicRelationshipTemplateReferencesFacade,
        @Inject public readonly relationships: RelationshipsFacade,
        @Inject public readonly relationshipTemplates: RelationshipTemplatesFacade,
        @Inject public readonly tags: TagsFacade,
        @Inject public readonly tokens: TokensFacade
    ) {}
}
