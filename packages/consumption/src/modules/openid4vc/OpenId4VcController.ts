import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { Holder } from "./local/Holder";

export class OpenId4VcController extends ConsumptionBaseController {
    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.OpenId4VcController, parent);
    }

    public async processCredentialOffer(credentialOffer: string): Promise<any> {
        // This is a dummy implementation for the sake of example.
        // In a real implementation, you would process the credential offer here.

        this._log.error("Processing credential offer:", credentialOffer);

        const holder = new Holder(3000, "OpenId4VcHolder");
        const res = await holder.resolveCredentialOffer(credentialOffer);
        this._log.error("Resolved credential offer:", res);

        const credential = await holder.requestAndStoreCredentials(res, { credentialsToRequest: ["EmployeeIdCard-sdjwt"] });
        this._log.error("Fetched credentials:", credential);

        // TODO: ask britta
        // currently we are simply creating a dummy IdentityAttribute
        /* await this._parent.attributes.createRepositoryAttribute({
            content: IdentityAttribute.from({
                value: { value: credentialOffer },
                owner: this.parent.accountController.identity.address
            })
        }); */

        return {
            status: "success",
            message: "Credential offer processed successfully",
            data: credentialOffer
        };
    }
}
