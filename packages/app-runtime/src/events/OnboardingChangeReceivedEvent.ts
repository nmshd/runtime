import { DataEvent, IdentityDVO, RelationshipAuditLogEntryDTO, RelationshipDTO } from "@nmshd/runtime";

export class OnboardingChangeReceivedEvent extends DataEvent<{
    relationship: RelationshipDTO;
    auditLogEntry: RelationshipAuditLogEntryDTO;
    identity: IdentityDVO;
}> {
    public static readonly namespace: string = "app.onboardingChangeReceived";

    public constructor(address: string, relationship: RelationshipDTO, auditLogEntry: RelationshipAuditLogEntryDTO, identity: IdentityDVO) {
        super(OnboardingChangeReceivedEvent.namespace, address, {
            relationship,
            auditLogEntry,
            identity
        });
    }
}
