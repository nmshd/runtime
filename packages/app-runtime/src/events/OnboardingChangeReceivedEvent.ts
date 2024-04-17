import { AuditLogEntryDTO, DataEvent, IdentityDVO, RelationshipDTO } from "@nmshd/runtime";

export class OnboardingChangeReceivedEvent extends DataEvent<{
    relationship: RelationshipDTO;
    auditLogEntry: AuditLogEntryDTO;
    identity: IdentityDVO;
}> {
    public static readonly namespace: string = "app.onboardingChangeReceived";

    public constructor(address: string, relationship: RelationshipDTO, auditLogEntry: AuditLogEntryDTO, identity: IdentityDVO) {
        super(OnboardingChangeReceivedEvent.namespace, address, {
            relationship,
            auditLogEntry,
            identity
        });
    }
}
