import { DcqlValidCredential, W3cJsonCredential } from "@credo-ts/core";
import { OpenId4VciResolvedCredentialOffer, OpenId4VpResolvedAuthorizationRequest } from "@credo-ts/openid4vc";
import { IdentityAttribute, TokenContentVerifiablePresentation, VerifiableCredential } from "@nmshd/content";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { OwnIdentityAttribute } from "../attributes";
import { Holder } from "./local/Holder";
import { KeyStorage } from "./local/KeyStorage";
import { OpenId4VciCredentialResponseJSON } from "./local/OpenId4VciCredentialResponseJSON";
import { RequestedCredentialCache } from "./local/RequestedCredentialCache";

export type OwnIdentityAttributeWithVerifiableCredential = OwnIdentityAttribute & {
    content: IdentityAttribute<VerifiableCredential>;
};

export class OpenId4VcController extends ConsumptionBaseController {
    private holder: Holder;
    private requestedCredentialCache: RequestedCredentialCache;

    private castToStringOrThrow(value: unknown): string {
        if (typeof value === "string") return value;
        try {
            return String(value);
        } catch (error) {
            const reason = error instanceof Error ? error.message : "unknown error";
            throw new Error(`Could not cast to string: ${reason}`);
        }
    }

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

    public async storeCredentials(credentialResponses: OpenId4VciCredentialResponseJSON[]): Promise<OwnIdentityAttributeWithVerifiableCredential> {
        const credentials = await this.holder.storeCredentials(credentialResponses);
        return credentials[0] as OwnIdentityAttributeWithVerifiableCredential;
    }

    public async resolveAuthorizationRequest(authorizationRequestUrl: string): Promise<{
        authorizationRequest: OpenId4VpResolvedAuthorizationRequest;
        matchingCredentials: OwnIdentityAttribute[];
    }> {
        const authorizationRequest = await this.holder.resolveAuthorizationRequest(authorizationRequestUrl);

        const matchingCredentials = await this.extractMatchingCredentialsFromAuthorizationRequest(authorizationRequest);
        return { authorizationRequest, matchingCredentials };
    }

    private async extractMatchingCredentialsFromAuthorizationRequest(authorizationRequest: OpenId4VpResolvedAuthorizationRequest): Promise<OwnIdentityAttribute[]> {
        const dcqlSatisfied = authorizationRequest.dcql?.queryResult.can_be_satisfied ?? false;
        if (!dcqlSatisfied) return [];

        let matchedCredentials: (string | W3cJsonCredential)[] = [];

        const queryId = authorizationRequest.dcql!.queryResult.credentials[0].id; // assume there is only one query for now
        const queryResult = authorizationRequest.dcql!.queryResult.credential_matches[queryId];
        if (queryResult.success) {
            matchedCredentials = queryResult.valid_credentials.map((vc: DcqlValidCredential) => vc.record.encoded).flat();
        }

        const matchedCredentialStrings = matchedCredentials.map((matchedCredential) => this.castToStringOrThrow(matchedCredential));

        const allCredentials = (await this.parent.attributes.getLocalAttributes({
            "@type": "OwnIdentityAttribute",
            "content.value.@type": "VerifiableCredential"
        })) as OwnIdentityAttribute[];

        const matchingCredentials = allCredentials.filter((credential) => {
            const credentialValueAsString = this.castToStringOrThrow((credential.content.value as VerifiableCredential).value);
            return matchedCredentialStrings.includes(credentialValueAsString);
        });
        return matchingCredentials;
    }

    public async acceptAuthorizationRequest(
        authorizationRequest: OpenId4VpResolvedAuthorizationRequest,
        credential: OwnIdentityAttribute
    ): Promise<{ status: number; message: string | Record<string, unknown> | null }> {
        const serverResponse = await this.holder.acceptAuthorizationRequest(authorizationRequest, credential);
        if (!serverResponse) throw new Error("No response from server");

        return { status: serverResponse.status, message: serverResponse.body };
    }

    public async createPresentationTokenContent(credential: VerifiableCredential, nonce: string): Promise<TokenContentVerifiablePresentation> {
        return await this.holder.createPresentationTokenContent(credential, nonce);
    }

    public async verifyPresentationTokenContent(tokenContent: TokenContentVerifiablePresentation, expectedNonce: string): Promise<{ isValid: boolean; error?: Error }> {
        return await this.holder.verifyPresentationTokenContent(tokenContent, expectedNonce);
    }
}
