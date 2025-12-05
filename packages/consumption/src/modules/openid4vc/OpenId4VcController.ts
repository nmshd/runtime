import { ClaimFormat, W3cJsonCredential } from "@credo-ts/core";
import { OpenId4VciCredentialResponse, OpenId4VciResolvedCredentialOffer, OpenId4VpResolvedAuthorizationRequest } from "@credo-ts/openid4vc";
import { VerifiableCredential } from "@nmshd/content";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { OwnIdentityAttribute } from "../attributes";
import { Holder } from "./local/Holder";
import { KeyStorage } from "./local/KeyStorage";

export class OpenId4VcController extends ConsumptionBaseController {
    private holder: Holder;

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.OpenId4VcController, parent);
    }

    public override async init(): Promise<this> {
        const collection = await this.parent.accountController.getSynchronizedCollection("openid4vc-keys");
        const keyStorage = new KeyStorage(collection, this._log);

        this.holder = new Holder(keyStorage, this.parent.accountController, this.parent.attributes, this.fetchInstance);
        await this.holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");

        return this;
    }

    private get fetchInstance(): typeof fetch {
        return this.parent.consumptionConfig.fetchInstance ?? fetch;
    }

    public async resolveCredentialOffer(credentialOfferUrl: string): Promise<OpenId4VciResolvedCredentialOffer> {
        return await this.holder.resolveCredentialOffer(credentialOfferUrl);
    }

    public async requestCredentials(
        credentialOffer: OpenId4VciResolvedCredentialOffer,
        credentialConfigurationIds: string[],
        pinCode?: string
    ): Promise<OpenId4VciCredentialResponse[]> {
        const credentialsResponses = await this.holder.requestCredentials(credentialOffer, { credentialConfigurationIds: credentialConfigurationIds, txCode: pinCode });
        return credentialsResponses;
    }

    public async storeCredentials(
        credentialResponses: (Omit<OpenId4VciCredentialResponse, "record"> & { record: { claimFormat: ClaimFormat; encoded: string | W3cJsonCredential } })[]
    ): Promise<OwnIdentityAttribute> {
        const credentials = await this.holder.storeCredentials(credentialResponses);

        // TODO: support multiple credentials
        return credentials[0];
    }

    public async resolveAuthorizationRequest(authorizationRequestUrl: string): Promise<{
        authorizationRequest: OpenId4VpResolvedAuthorizationRequest;
        matchingCredentials: OwnIdentityAttribute[];
    }> {
        const authorizationRequest = await this.holder.resolveAuthorizationRequest(authorizationRequestUrl);

        const matchingCredentials = await this.extractMatchingCredentialsFromAuthorizationRequest(authorizationRequest);

        return {
            authorizationRequest,
            matchingCredentials
        };
    }

    private async extractMatchingCredentialsFromAuthorizationRequest(authorizationRequest: OpenId4VpResolvedAuthorizationRequest): Promise<OwnIdentityAttribute[]> {
        const dcqlSatisfied = authorizationRequest.dcql?.queryResult.can_be_satisfied ?? false;
        const authorizationRequestSatisfied = authorizationRequest.presentationExchange?.credentialsForRequest.areRequirementsSatisfied ?? false;
        if (!dcqlSatisfied && !authorizationRequestSatisfied) {
            return [];
        }

        // there is no easy method to check which credentials were used in dcql
        // this has to be added later
        if (!authorizationRequestSatisfied) return [];

        const matchedCredentialsFromPresentationExchange = authorizationRequest.presentationExchange?.credentialsForRequest.requirements
            .map((entry) => entry.submissionEntry.map((subEntry) => subEntry.verifiableCredentials.map((vc) => vc.credentialRecord.encoded)).flat())
            .flat();

        const allCredentials = (await this.parent.attributes.getLocalAttributes({
            "@type": "OwnIdentityAttribute",
            "content.value.@type": "VerifiableCredential"
        })) as OwnIdentityAttribute[];

        const matchingCredentials = allCredentials.filter((credential) =>
            matchedCredentialsFromPresentationExchange?.includes((credential.content.value as VerifiableCredential).value as string)
        ); // in current demo scenarios this is a string
        return matchingCredentials;
    }

    public async acceptAuthorizationRequest(
        authorizationRequest: OpenId4VpResolvedAuthorizationRequest
    ): Promise<{ status: number; message: string | Record<string, unknown> | null }> {
        // parse the credential type to be sdjwt

        const serverResponse = await this.holder.acceptAuthorizationRequest(authorizationRequest);
        if (!serverResponse) throw new Error("No response from server");

        return { status: serverResponse.status, message: serverResponse.body };
    }
}
