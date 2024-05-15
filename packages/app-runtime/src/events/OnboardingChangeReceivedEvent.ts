import { DataEvent, IdentityDVO, RelationshipChangeDTO, RelationshipDTO } from "@nmshd/runtime";

export class OnboardingChangeReceivedEvent extends DataEvent<{
    change: RelationshipChangeDTO;
    relationship: RelationshipDTO;
    identity: IdentityDVO;
}> {
    public static readonly namespace: string = "app.onboardingChangeReceived";

    public constructor(address: string, change: RelationshipChangeDTO, relationship: RelationshipDTO, identity: IdentityDVO) {
        super(OnboardingChangeReceivedEvent.namespace, address, {
            change,
            relationship,
            identity
        });
    }
}
