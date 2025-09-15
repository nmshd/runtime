/* eslint-disable no-console */
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { Holder } from "./local/Holder";

export class OpenId4VcController extends ConsumptionBaseController {
    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.OpenId4VcController, parent);
    }

    public async fetchCredentialOffer(credentialOfferUrl: string): Promise<any> {
        const holder = new Holder(3000, "OpenId4VcHolder");
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const res = await holder.resolveCredentialOffer(credentialOfferUrl);
        console.log("Fetched credential offer:", res);
        return {
            data: JSON.stringify(res)
        };
    }

    public async fetchProofRequest(proofRequestUrl: string): Promise<any> {
        const holder = new Holder(3000, "OpenId4VcHolder");
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const res = await holder.resolveProofRequest(proofRequestUrl);
        console.log("Fetched proof request:", res);
        return {
            data: JSON.stringify(res)
        };
    }

    public async processFetchedCredentialOffer(fetchedCredentialOffer: string, requestedCredentialOffers: string[], pinCode?: string): Promise<any> {
        const holder = new Holder(3000, "OpenId4VcHolder");
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const credentialOffer = JSON.parse(fetchedCredentialOffer);
        const credentials = await holder.requestAndStoreCredentials(credentialOffer, { credentialsToRequest: requestedCredentialOffers, txCode: pinCode });
        console.log("Fetched credentials:", credentials);
        return {
            status: "success",
            message: "Credential offer processed successfully",
            data: JSON.stringify(credentials)
        };
    }

    public async processCredentialOffer(credentialOffer: string): Promise<any> {
        try {
            const holder = new Holder(3000, "OpenId4VcHolder");
            await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
            const res = await holder.resolveCredentialOffer(credentialOffer);
            const credentials = await holder.requestAndStoreCredentials(res, { credentialsToRequest: ["EmployeeIdCard-sdjwt"] });
            console.log("Fetched credentials:", credentials);

            /*
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
                */

            return {
                status: "success",
                message: "Credential offer processed successfully",
                data: JSON.stringify(credentials)
            };
        } catch (error) {
            let errorMessage = "Unknown error";
            let errorStack = "";

            if (error instanceof Error) {
                errorMessage = error.message;
                errorStack = error.stack ?? "";
            } else if (typeof error === "string") {
                errorMessage = error;
            } else {
                errorMessage = JSON.stringify(error);
            }

            return {
                status: "error",
                message: `Failed to process credential offer: ${errorMessage}`,
                data: JSON.stringify(errorStack)
            };
        }
    }
}
