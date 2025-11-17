import { ClaimFormat } from "@credo-ts/core";
import { OpenId4VpResolvedAuthorizationRequest } from "@credo-ts/openid4vc";
import { VerifiableCredential } from "@nmshd/content";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { Holder } from "./local/Holder";

export class OpenId4VcController extends ConsumptionBaseController {
    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.OpenId4VcController, parent);
    }

    public async fetchCredentialOffer(credentialOfferUrl: string): Promise<{ data: string }> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const res = await holder.resolveCredentialOffer(credentialOfferUrl);
        return {
            data: JSON.stringify(res)
        };
    }

    public async processFetchedCredentialOffer(
        fetchedCredentialOffer: string,
        requestedCredentialOffers: string[],
        pinCode?: string
    ): Promise<{ data: string; id: string; type: string; displayInformation: string | undefined }> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const credentialOffer = JSON.parse(fetchedCredentialOffer);
        const credentials = await holder.requestAndStoreCredentials(credentialOffer, { credentialsToRequest: requestedCredentialOffers, txCode: pinCode });

        // TODO: support multiple credentials
        const credential = credentials[0].content.value as VerifiableCredential;

        return {
            data: credential.value,
            // multi credentials not supported yet
            id: credentials[0].id.toString(),
            type: credential.type,
            displayInformation: credential.displayInformation
        };
    }

    public async processCredentialOffer(credentialOffer: string): Promise<{ data: string; id: string; type: string; displayInformation: string | undefined }> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const res = await holder.resolveCredentialOffer(credentialOffer);
        const credentials = await holder.requestAndStoreCredentials(res, { credentialsToRequest: Object.keys(res.offeredCredentialConfigurations) });

        // TODO: support multiple credentials
        const credential = credentials[0].content.value as VerifiableCredential;

        return {
            data: credential.value,
            // multi credentials not supported yet
            id: credentials[0].id.toString(),
            type: credential.type,
            displayInformation: credential.displayInformation
        };
    }

    public async resolveAuthorizationRequest(
        requestUrl: string
    ): Promise<{ authorizationRequest: OpenId4VpResolvedAuthorizationRequest; usedCredentials: { id: string; data: string; type: string; displayInformation?: string }[] }> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const authorizationRequest = await holder.resolveAuthorizationRequest(requestUrl);

        // TODO: extract DTOs

        const matchedCredentialsSdJwtVc = authorizationRequest.presentationExchange?.credentialsForRequest.requirements
            .map((entry) =>
                entry.submissionEntry
                    .map((subEntry) => subEntry.verifiableCredentials.filter((vc) => vc.claimFormat === ClaimFormat.SdJwtDc).map((vc) => vc.credentialRecord.compactSdJwtVc))
                    .flat()
            )
            .flat();

        const allCredentials = await this.getVerifiableCredentials();

        const usedCredentials = allCredentials.filter((credential) => matchedCredentialsSdJwtVc?.includes(credential.data));

        return {
            authorizationRequest,
            usedCredentials
        };
    }

    public async acceptAuthorizationRequest(
        authorizationRequest: OpenId4VpResolvedAuthorizationRequest
    ): Promise<{ status: number; message: string | Record<string, unknown> | null }> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        // parse the credential type to be sdjwt

        const serverResponse = await holder.acceptAuthorizationRequest(authorizationRequest);
        if (!serverResponse) throw new Error("No response from server");

        return { status: serverResponse.status, message: serverResponse.body };
    }

    public async getVerifiableCredentials(ids?: string[]): Promise<{ id: string; data: string; type: string; displayInformation?: string }[]> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");

        const credentials = await holder.getVerifiableCredentials(ids);

        return credentials.map((credential) => {
            const value = credential.content.value as VerifiableCredential;

            return { id: credential.id.toString(), data: value.value, type: value.type, displayInformation: value.displayInformation };
        });
    }
}
