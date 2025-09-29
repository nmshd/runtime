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
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const res = await holder.resolveCredentialOffer(credentialOfferUrl);
        console.log("Fetched credential offer:", res);
        return {
            data: JSON.stringify(res)
        };
    }

    public async processFetchedCredentialOffer(fetchedCredentialOffer: string, requestedCredentialOffers: string[], pinCode?: string): Promise<any> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const credentialOffer = JSON.parse(fetchedCredentialOffer);
        const credentials = await holder.requestAndStoreCredentials(credentialOffer, { credentialsToRequest: requestedCredentialOffers, txCode: pinCode });
        console.log("Fetched credentials:", credentials);
        return {
            status: "success",
            message: "Credential offer processed successfully",
            data: JSON.stringify(credentials),
            id: credentials.length > 0 ? credentials[0].id : undefined
        };
    }

    public async processCredentialOffer(credentialOffer: string): Promise<any> {
        try {
            const holder = new Holder(this.parent.accountController, this.parent.attributes);
            await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
            const res = await holder.resolveCredentialOffer(credentialOffer);
            const credentials = await holder.requestAndStoreCredentials(res, { credentialsToRequest: ["EmployeeIdCard-sdjwt"] });

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

    public async fetchProofRequest(proofRequestUrl: string): Promise<any> {
        try {
            const holder = new Holder(this.parent.accountController, this.parent.attributes);
            await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
            const res = await holder.resolveProofRequest(proofRequestUrl);
            console.log("Fetched proof request:", res);
            return {
                data: JSON.stringify(res)
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
                message: `Failed to fetch proof request: ${errorMessage}`,
                data: JSON.stringify(errorStack)
            };
        }
    }

    public async acceptProofRequest(jsonEncodedRequest: string): Promise<any> {
        try {
            const holder = new Holder(this.parent.accountController, this.parent.attributes);
            await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
            const fetchedRequest = JSON.parse(jsonEncodedRequest);
            // parse the credential type to be sdjwt

            const serverResponse = await holder.acceptPresentationRequest(fetchedRequest);
            console.log("Created proof:", JSON.stringify(serverResponse));
            return {
                status: serverResponse.status,
                message: serverResponse.body
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
                message: `Failed to process proof request: ${errorMessage}`,
                data: JSON.stringify(errorStack)
            };
        }
    }
}
