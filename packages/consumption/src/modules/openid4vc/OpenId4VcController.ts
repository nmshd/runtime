import { IdentityAttribute } from "@nmshd/content";
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
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const res = await holder.resolveCredentialOffer(credentialOffer);
        this._log.error("Resolved credential offer:", res);

        const credentials = await holder.requestAndStoreCredentials(res, { credentialsToRequest: ["EmployeeIdCard-sdjwt"] });
        this._log.error("Fetched credentials:", credentials);

        const attributes = [];

        for (const credential of credentials) {
            const owner = this.parent.accountController.identity.address;
            const identityAttribute = IdentityAttribute.from({
                value: {
                    "@type": "VerifiableCredential",
                    value: credential,
                    title: "Employee ID Card",
                    description: "An employee ID card credential"
                },
                owner: owner
            });
            const attribute = await this.parent.attributes.createRepositoryAttribute({
                content: identityAttribute
            });
            this._log.error("Created attribute:", attribute);
            attributes.push(attribute);
        }

        return {
            status: "success",
            message: "Credential offer processed successfully",
            data: credentialOffer
        };
    }
}
