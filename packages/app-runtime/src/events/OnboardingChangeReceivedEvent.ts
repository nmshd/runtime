import { DataEvent, IdentityDVO, RelationshipDTO } from "@nmshd/runtime";

export class OnboardingChangeReceivedEvent extends DataEvent<{
    relationship: RelationshipDTO;
    identity: IdentityDVO;
}> {
    public static readonly namespace: string = "app.onboardingChangeReceived";

    public constructor(address: string, relationship: RelationshipDTO, identity: IdentityDVO) {
        super(OnboardingChangeReceivedEvent.namespace, address, {
            relationship,
            identity
        });
    }
}
