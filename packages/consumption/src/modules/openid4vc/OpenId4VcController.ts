import { DcqlValidCredential, W3cJsonCredential } from "@credo-ts/core";
import { OpenId4VciResolvedCredentialOffer, OpenId4VpResolvedAuthorizationRequest } from "@credo-ts/openid4vc";
import { VerifiableCredential, VerifiablePresentation } from "@nmshd/content";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { OwnIdentityAttribute } from "../attributes";
import { Holder } from "./local/Holder";
import { KeyStorage } from "./local/KeyStorage";
import { OpenId4VciCredentialResponseJSON } from "./local/OpenId4VciCredentialResponseJSON";
import { RequestedCredentialCache } from "./local/RequestedCredentialCache";

export class OpenId4VcController extends ConsumptionBaseController {
    private holder: Holder;
    private requestedCredentialCache: RequestedCredentialCache;

    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.OpenId4VcController, parent);
    }

    public override async init(): Promise<this> {
        const keyCollection = await this.parent.accountController.getSynchronizedCollection("openid4vc-keys");
        const keyStorage = new KeyStorage(keyCollection, this._log);

        this.holder = new Holder(keyStorage, this.parent.accountController, this.parent.attributes, this.fetchInstance);
        await this.holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");

        const requestedCredentialsCacheCollection = await this.parent.accountController.getSynchronizedCollection("openid4vc-requested-credentials-cache");
        this.requestedCredentialCache = new RequestedCredentialCache(requestedCredentialsCacheCollection);

        return this;
    }

    private get fetchInstance(): typeof fetch {
        return this.parent.consumptionConfig.fetchInstance ?? fetch;
    }

    public async requestAllCredentialsFromCredentialOfferUrl(credentialOfferUrl: string): Promise<OpenId4VciCredentialResponseJSON[]> {
        const cachedCredentialResponses = await this.requestedCredentialCache.get(credentialOfferUrl);
        if (cachedCredentialResponses) return cachedCredentialResponses;

        const offer = await this.resolveCredentialOffer(credentialOfferUrl);
        const credentialResponses = await this.requestCredentials(offer, offer.credentialOfferPayload.credential_configuration_ids, { pinCode: undefined });

        await this.requestedCredentialCache.set(credentialOfferUrl, credentialResponses);
        await this.parent.accountController.syncDatawallet();

        return credentialResponses;
    }

    public async resolveCredentialOffer(credentialOfferUrl: string): Promise<OpenId4VciResolvedCredentialOffer> {
        return await this.holder.resolveCredentialOffer(credentialOfferUrl);
    }

    public async requestCredentials(
        credentialOffer: OpenId4VciResolvedCredentialOffer,
        credentialConfigurationIds: string[],
        access: { pinCode?: string } | { accessToken: string }
    ): Promise<OpenId4VciCredentialResponseJSON[]> {
        const credentialResponses = await this.holder.requestCredentials(credentialOffer, credentialConfigurationIds, access);

        const mappedResponses = credentialResponses.map((response) => ({
            claimFormat: response.record.firstCredential.claimFormat,
            encoded: response.record.firstCredential.encoded,
            displayInformation: response.credentialConfiguration.credential_metadata?.display ?? (response.credentialConfiguration.display as Record<string, unknown>[] | undefined)
        }));

        return mappedResponses;
    }

    public async storeCredentials(credentialResponses: OpenId4VciCredentialResponseJSON[]): Promise<OwnIdentityAttribute> {
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
        const pexSatisfied = authorizationRequest.presentationExchange?.credentialsForRequest.areRequirementsSatisfied ?? false;
        if (!dcqlSatisfied && !pexSatisfied) return [];

        let matchedCredentials: (string | W3cJsonCredential)[] = [];
        if (dcqlSatisfied) {
            const queryId = authorizationRequest.dcql!.queryResult.credentials[0].id; // assume there is only one query for now
            const queryResult = authorizationRequest.dcql!.queryResult.credential_matches[queryId];
            if (queryResult.success) {
                matchedCredentials = queryResult.valid_credentials.map((vc: DcqlValidCredential) => vc.record.encoded).flat();
            }
        } else if (pexSatisfied) {
            matchedCredentials = authorizationRequest
                .presentationExchange!.credentialsForRequest.requirements.map((entry) =>
                    entry.submissionEntry.map((subEntry) => subEntry.verifiableCredentials.map((vc) => vc.credentialRecord.encoded)).flat()
                )
                .flat();
        }

        const allCredentials = (await this.parent.attributes.getLocalAttributes({
            "@type": "OwnIdentityAttribute",
            "content.value.@type": "VerifiableCredential"
        })) as OwnIdentityAttribute[];

        const matchingCredentials = allCredentials.filter((credential) => matchedCredentials.includes((credential.content.value as VerifiableCredential).value as string)); // in current demo scenarios this is a string
        return matchingCredentials;
    }

    public async acceptAuthorizationRequest(
        authorizationRequest: OpenId4VpResolvedAuthorizationRequest,
        credential: OwnIdentityAttribute
    ): Promise<{ status: number; message: string | Record<string, unknown> | null }> {
        // parse the credential type to be sdjwt

        const serverResponse = await this.holder.acceptAuthorizationRequest(authorizationRequest, credential);
        if (!serverResponse) throw new Error("No response from server");

        return { status: serverResponse.status, message: serverResponse.body };
    }

    public async createPresentationForToken(credential: VerifiableCredential): Promise<VerifiablePresentation> {
        return await this.holder.createPresentationForToken(credential);
    }
}
