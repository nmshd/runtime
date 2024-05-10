import { Inject } from "typescript-ioc";
import {
    AccountFacade,
    ChallengesFacade,
    DevicesFacade,
    FilesFacade,
    IdentityDeletionProcessesFacade,
    IdentityFacade,
    MessagesFacade,
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
        @Inject public readonly identity: IdentityFacade,
        @Inject public readonly identityDeletionProcesses: IdentityDeletionProcessesFacade
    ) {}
}
