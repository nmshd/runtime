import { ClaimFormat } from "@credo-ts/core";
import { OpenId4VpResolvedAuthorizationRequest } from "@credo-ts/openid4vc";
import { VerifiableCredential } from "@nmshd/content";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { Holder } from "./local/Holder";
import { KeyStorage } from "./local/KeyStorage";

export class OpenId4VcController extends ConsumptionBaseController {
    private keyStorage: KeyStorage;

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.OpenId4VcController, parent);
    }

    public override async init(): Promise<this> {
        const collection = await this.parent.accountController.getSynchronizedCollection("openid4vc-keys");
        this.keyStorage = new KeyStorage(collection, this._log);

        return this;
    }

    private get fetchInstance(): typeof fetch {
        return this.parent.consumptionConfig.fetchInstance ?? fetch;
    }

    public async resolveCredentialOffer(credentialOfferUrl: string): Promise<{ data: string }> {
        const holder = new Holder(this.keyStorage, this.parent.accountController, this.parent.attributes, this.fetchInstance);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const res = await holder.resolveCredentialOffer(credentialOfferUrl);
        return {
            data: JSON.stringify(res)
        };
    }

    public async acceptCredentialOffer(
        credentialOffer: string,
        credentialConfigurationIds: string[],
        pinCode?: string
    ): Promise<{ data: string; id: string; type: string; displayInformation: string | undefined }> {
        const holder = new Holder(this.keyStorage, this.parent.accountController, this.parent.attributes, this.fetchInstance);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const credentials = await holder.requestAndStoreCredentials(JSON.parse(credentialOffer), { credentialsToRequest: credentialConfigurationIds, txCode: pinCode });

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

    public async resolveAndAcceptCredentialOffer(credentialOffer: string): Promise<{ data: string; id: string; type: string; displayInformation: string | undefined }> {
        const holder = new Holder(this.keyStorage, this.parent.accountController, this.parent.attributes, this.fetchInstance);
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
        authorizationRequestUrl: string
    ): Promise<{ authorizationRequest: OpenId4VpResolvedAuthorizationRequest; usedCredentials: { id: string; data: string; type: string; displayInformation?: string }[] }> {
        const holder = new Holder(this.keyStorage, this.parent.accountController, this.parent.attributes, this.fetchInstance);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const authorizationRequest = await holder.resolveAuthorizationRequest(authorizationRequestUrl);

        // TODO: extract DTOs

        const usedCredentials = await this.extractUsedCredentialsFromAuthorizationRequest(authorizationRequest);

        return {
            authorizationRequest,
            usedCredentials
        };
    }

    private async extractUsedCredentialsFromAuthorizationRequest(
        authorizationRequest: OpenId4VpResolvedAuthorizationRequest
    ): Promise<{ id: string; data: string; type: string; displayInformation?: string }[]> {
        const dcqlSatisfied = authorizationRequest.dcql?.queryResult.can_be_satisfied ?? false;
        const authorizationRequestSatisfied = authorizationRequest.presentationExchange?.credentialsForRequest.areRequirementsSatisfied ?? false;
        if (!dcqlSatisfied && !authorizationRequestSatisfied) {
            return [];
        }

        // there is no easy method to check which credentials were used in dcql
        // this has to be added later
        if (!authorizationRequestSatisfied) return [];

        const matchedCredentialsFromPresentationExchange = authorizationRequest.presentationExchange?.credentialsForRequest.requirements
            .map((entry) =>
                entry.submissionEntry
                    .map((subEntry) => subEntry.verifiableCredentials.filter((vc) => vc.claimFormat === ClaimFormat.SdJwtDc).map((vc) => vc.credentialRecord.compactSdJwtVc))
                    .flat()
            )
            .flat();

        const allCredentials = await this.getVerifiableCredentials();

        const usedCredentials = allCredentials.filter((credential) => matchedCredentialsFromPresentationExchange?.includes(credential.data));
        return usedCredentials;
    }

    public async acceptAuthorizationRequest(
        authorizationRequest: OpenId4VpResolvedAuthorizationRequest
    ): Promise<{ status: number; message: string | Record<string, unknown> | null }> {
        const holder = new Holder(this.keyStorage, this.parent.accountController, this.parent.attributes, this.fetchInstance);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        // parse the credential type to be sdjwt

        const serverResponse = await holder.acceptAuthorizationRequest(authorizationRequest);
        if (!serverResponse) throw new Error("No response from server");

        return { status: serverResponse.status, message: serverResponse.body };
    }

    public async getVerifiableCredentials(ids?: string[]): Promise<{ id: string; data: string; type: string; displayInformation?: string }[]> {
        const holder = new Holder(this.keyStorage, this.parent.accountController, this.parent.attributes, this.fetchInstance);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");

        const credentials = await holder.getVerifiableCredentials(ids);

        return credentials.map((credential) => {
            const value = credential.content.value as VerifiableCredential;

            return { id: credential.id.toString(), data: value.value, type: value.type, displayInformation: value.displayInformation };
        });
    }
}
