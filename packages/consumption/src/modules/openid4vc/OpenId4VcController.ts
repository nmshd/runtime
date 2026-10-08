import {
    OpenId4VcJsonValue,
    OpenId4VciResolvedCredentialOffer,
    OpenId4VpResolvedAuthorizationRequest,
    TokenContentVerifiablePresentation,
    VerifiableCredential
} from "@nmshd/content";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { OwnIdentityAttribute } from "../attributes";
import { Holder } from "./local/Holder";
import { KeyStorage } from "./local/KeyStorage";
import { OpenId4VciCredentialResponseJSON } from "./local/OpenId4VciCredentialResponseJSON";
import { RequestedCredentialCache } from "./local/RequestedCredentialCache";
import { OwnIdentityAttributeWithVerifiableCredential } from "./local/VerifiableCredentialAttribute";

export { isVerifiableCredentialAttribute, OwnIdentityAttributeWithVerifiableCredential } from "./local/VerifiableCredentialAttribute";

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
        return await this.holder.requestCredentials(credentialOffer, credentialConfigurationIds, access);
    }

    public async storeCredentials(credentialResponses: OpenId4VciCredentialResponseJSON[]): Promise<OwnIdentityAttributeWithVerifiableCredential> {
        const credentials = await this.holder.storeCredentials(credentialResponses);
        return credentials[0];
    }

    public async resolveAuthorizationRequest(authorizationRequestUrl: string): Promise<{
        authorizationRequest: OpenId4VpResolvedAuthorizationRequest;
        matchingCredentials: OwnIdentityAttributeWithVerifiableCredential[];
    }> {
        const authorizationRequest = await this.holder.resolveAuthorizationRequest(authorizationRequestUrl);

        const matchingCredentials = await this.holder.matchingCredentials(authorizationRequest);
        return { authorizationRequest, matchingCredentials };
    }

    public async acceptAuthorizationRequest(
        authorizationRequest: OpenId4VpResolvedAuthorizationRequest,
        credential: OwnIdentityAttribute
    ): Promise<{ status: number; message: OpenId4VcJsonValue }> {
        const serverResponse = await this.holder.acceptAuthorizationRequest(authorizationRequest, credential);

        return { status: serverResponse.status, message: serverResponse.body };
    }

    public async createPresentationTokenContent(credential: VerifiableCredential, nonce: string): Promise<TokenContentVerifiablePresentation> {
        return await this.holder.createPresentationTokenContent(credential, nonce);
    }

    public async verifyPresentationTokenContent(tokenContent: TokenContentVerifiablePresentation, expectedNonce: string): Promise<{ isValid: boolean; error?: Error }> {
        return await this.holder.verifyPresentationTokenContent(tokenContent, expectedNonce);
    }
}
