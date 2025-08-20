import { IdentityAttribute } from "@nmshd/content";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";

export class OpenId4VcController extends ConsumptionBaseController {
    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.OpenId4VcController, parent);
    }

    public async processCredentialOffer(credentialOffer: string): Promise<any> {
        // This is a dummy implementation for the sake of example.
        // In a real implementation, you would process the credential offer here.

        // TODO: insert holder code here

        // currently we are simply creating a dummy IdentityAttribute
        await this.parent.attributes.createRepositoryAttribute({
            content: IdentityAttribute.from({
                value: { value: credentialOffer },
                owner: this.parent.accountController.identity.address
            })
        });

        return {
            status: "success",
            message: "Credential offer processed successfully",
            data: credentialOffer
        };
    }
}
