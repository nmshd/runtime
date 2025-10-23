import {
    BaseRecord,
    ClaimFormat,
    DidJwk,
    DidKey,
    InjectionSymbols,
    JwkDidCreateOptions,
    KeyDidCreateOptions,
    Kms,
    Mdoc,
    MdocRecord,
    SdJwtVcRecord,
    X509Module
} from "@credo-ts/core";
import {
    OpenId4VcModule,
    OpenId4VciAuthorizationFlow,
    authorizationCodeGrantIdentifier,
    preAuthorizedCodeGrantIdentifier,
    type OpenId4VciMetadata,
    type OpenId4VciResolvedCredentialOffer,
    type OpenId4VpResolvedAuthorizationRequest
} from "@credo-ts/openid4vc";
import { AccountController } from "@nmshd/transport";
import { AttributesController, LocalAttribute } from "../../attributes";
import { BaseAgent } from "./BaseAgent";
import { EnmeshedStorageService } from "./EnmeshedStorageService";

function getOpenIdHolderModules() {
    return {
        openid4vc: new OpenId4VcModule(),
        x509: new X509Module({
            getTrustedCertificatesForVerification: (_agentContext, { certificateChain, verification }) => {
                // eslint-disable-next-line no-console
                console.log(`dyncamically trusting certificate ${certificateChain[0].getIssuerNameField("C")} for verification of ${verification.type}`);
                return [certificateChain[0].toString("pem")];
            }
        })
    } as const;
}

export class Holder extends BaseAgent<ReturnType<typeof getOpenIdHolderModules>> {
    public client = {
        clientId: "wallet",
        redirectUri: "http://localhost:3000/redirect"
    };

    public constructor(accountController: AccountController, attributeController: AttributesController) {
        super(3000, `OpenId4VcHolder ${Math.random().toString()}`, getOpenIdHolderModules(), accountController, attributeController);
    }

    public async getVerifiableCredentials(ids: string[] | undefined): Promise<any[]> {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
        const storageService = this.agent.dependencyManager.resolve(InjectionSymbols.StorageService) as EnmeshedStorageService<BaseRecord>;
        const allCredentials = await storageService.getAllAsAttributes(this.agent.context, SdJwtVcRecord);

        if (!ids) return allCredentials;
        return allCredentials.filter((vc) => ids.includes(vc.id.toString()));
    }

    public async resolveCredentialOffer(credentialOffer: string): Promise<OpenId4VciResolvedCredentialOffer> {
        return await this.agent.openid4vc.holder.resolveCredentialOffer(credentialOffer);
    }

    public async resolveIssuerMetadata(credentialIssuer: string): Promise<OpenId4VciMetadata> {
        return await this.agent.openid4vc.holder.resolveIssuerMetadata(credentialIssuer);
    }

    public async initiateAuthorization(resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer, credentialsToRequest: string[]): Promise<any> {
        const grants = resolvedCredentialOffer.credentialOfferPayload.grants;
        if (grants?.[preAuthorizedCodeGrantIdentifier]) {
            return {
                authorizationFlow: "PreAuthorized",
                preAuthorizedCode: grants[preAuthorizedCodeGrantIdentifier]["pre-authorized_code"]
            } as const;
        }

        if (resolvedCredentialOffer.credentialOfferPayload.grants?.[authorizationCodeGrantIdentifier]) {
            const resolvedAuthorizationRequest = await this.agent.openid4vc.holder.resolveOpenId4VciAuthorizationRequest(resolvedCredentialOffer, {
                clientId: this.client.clientId,
                redirectUri: this.client.redirectUri,
                scope: Object.entries(resolvedCredentialOffer.offeredCredentialConfigurations)
                    .map(([id, value]) => (credentialsToRequest.includes(id) ? value.scope : undefined))
                    .filter((v): v is string => Boolean(v))
            });

            if (resolvedAuthorizationRequest.authorizationFlow === OpenId4VciAuthorizationFlow.PresentationDuringIssuance) {
                return {
                    ...resolvedAuthorizationRequest,
                    authorizationFlow: `${OpenId4VciAuthorizationFlow.PresentationDuringIssuance}`
                } as const;
            }
            return {
                ...resolvedAuthorizationRequest,
                authorizationFlow: `${OpenId4VciAuthorizationFlow.Oauth2Redirect}`
            } as const;
        }

        throw new Error("Unsupported grant type");
    }

    public async requestAndStoreCredentials(
        resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer,
        options: {
            clientId?: string;
            codeVerifier?: string;
            credentialsToRequest: string[];
            code?: string;
            redirectUri?: string;
            txCode?: string;
        }
    ): Promise<LocalAttribute[]> {
        const tokenResponse = await this.agent.openid4vc.holder.requestToken(
            options.code && options.clientId
                ? {
                      resolvedCredentialOffer,
                      clientId: options.clientId,
                      codeVerifier: options.codeVerifier,
                      code: options.code,
                      redirectUri: options.redirectUri
                  }
                : {
                      resolvedCredentialOffer,
                      txCode: options.txCode
                  }
        );

        const credentialResponse = await this.agent.openid4vc.holder.requestCredentials({
            resolvedCredentialOffer,
            clientId: options.clientId,
            credentialConfigurationIds: options.credentialsToRequest,
            credentialBindingResolver: async ({ supportedDidMethods, supportsAllDidMethods, proofTypes }) => {
                const key = await this.agent.kms.createKeyForSignatureAlgorithm({
                    algorithm: proofTypes.jwt?.supportedSignatureAlgorithms[0] ?? "EdDSA"
                });
                const publicJwk = Kms.PublicJwk.fromPublicJwk(key.publicJwk);

                if (supportsAllDidMethods || supportedDidMethods?.includes("did:key")) {
                    await this.agent.dids.create<KeyDidCreateOptions>({
                        method: "key",
                        options: {
                            keyId: key.keyId
                        }
                    });
                    const didKey = new DidKey(publicJwk);

                    return {
                        method: "did",
                        didUrls: [`${didKey.did}#${didKey.publicJwk.fingerprint}`]
                    };
                }
                if (supportedDidMethods?.includes("did:jwk")) {
                    const didJwk = DidJwk.fromPublicJwk(publicJwk);
                    await this.agent.dids.create<JwkDidCreateOptions>({
                        method: "jwk",
                        options: {
                            keyId: key.keyId
                        }
                    });

                    return {
                        method: "did",
                        didUrls: [`${didJwk.did}#0`]
                    };
                }

                // We fall back on jwk binding
                return {
                    method: "jwk",
                    keys: [publicJwk]
                };
            },
            ...tokenResponse
        });

        this.agent.config.logger.info("Credential response:", credentialResponse);

        const storedCredentials = await Promise.all(
            credentialResponse.credentials.map((response) => {
                // TODO: batch issuance not yet supported
                const credential = response.credentials[0];
                // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
                const enmeshedStorageService = this.agent.dependencyManager.resolve(InjectionSymbols.StorageService) as EnmeshedStorageService<BaseRecord>;
                let credentialKey = "";
                for (const resolved in resolvedCredentialOffer.offeredCredentialConfigurations) {
                    credentialKey = resolved;
                }
                const displayInfo = resolvedCredentialOffer.offeredCredentialConfigurations[credentialKey].display as any;

                // if the displayInfo does not provide a logo - we try to load a logo from the issuers attributes
                if (
                    displayInfo !== undefined &&
                    displayInfo[0]?.logo === undefined &&
                    resolvedCredentialOffer.metadata.credentialIssuer.display !== undefined &&
                    (resolvedCredentialOffer.metadata.credentialIssuer.display as any)?.[0] !== undefined &&
                    (resolvedCredentialOffer.metadata.credentialIssuer.display as any)?.[0]?.["logo"] !== undefined
                ) {
                    const logoInformation = (resolvedCredentialOffer.metadata.credentialIssuer.display as any)?.[0]?.["logo"];
                    displayInfo[0]["logo"] = logoInformation;
                }

                if (credential.claimFormat === ClaimFormat.MsoMdoc) {
                    return enmeshedStorageService.saveWithDisplay(
                        this.agent.context,
                        credential.base64Url,
                        credential.claimFormat.toString(),
                        JSON.stringify(displayInfo),
                        credentialKey
                    );
                } else if (credential.claimFormat === ClaimFormat.SdJwtDc) {
                    return enmeshedStorageService.saveWithDisplay(
                        this.agent.context,
                        credential.compact,
                        credential.claimFormat.toString(),
                        JSON.stringify(displayInfo),
                        credentialKey
                    );
                } else if (credential.claimFormat === ClaimFormat.SdJwtW3cVc) {
                    return enmeshedStorageService.saveWithDisplay(
                        this.agent.context,
                        credential.encoded,
                        credential.claimFormat.toString(),
                        JSON.stringify(displayInfo),
                        credentialKey
                    );
                }
                throw new Error("Unsupported credential format");
            })
        );

        this.agent.config.logger.info(`Stored credentials: ${JSON.stringify(storedCredentials)}`);
        return storedCredentials;
    }

    public async resolveProofRequest(proofRequest: string): Promise<any> {
        const resolvedProofRequest = await this.agent.openid4vc.holder.resolveOpenId4VpAuthorizationRequest(proofRequest);

        return resolvedProofRequest;
    }

    public async acceptPresentationRequest(resolvedPresentationRequest: OpenId4VpResolvedAuthorizationRequest): Promise<any> {
        if (!resolvedPresentationRequest.presentationExchange && !resolvedPresentationRequest.dcql) {
            throw new Error("Missing presentation exchange or dcql on resolved authorization request");
        }

        // This fix ensures that the credential records which have been loaded here actually do provide the encoded() method
        // this issue arises as the records are loaded and then communicated to the app as a json object, losing the class prototype
        if (resolvedPresentationRequest.presentationExchange) {
            for (const requirementKey in resolvedPresentationRequest.presentationExchange.credentialsForRequest.requirements) {
                const requirement = resolvedPresentationRequest.presentationExchange.credentialsForRequest.requirements[requirementKey];
                for (const submissionEntry of requirement.submissionEntry) {
                    for (const vc of submissionEntry.verifiableCredentials) {
                        if (vc.claimFormat === ClaimFormat.SdJwtDc) {
                            const recordUncast = vc.credentialRecord;
                            const record = new SdJwtVcRecord({
                                id: recordUncast.id,
                                createdAt: recordUncast.createdAt,
                                compactSdJwtVc: recordUncast.compactSdJwtVc
                            });
                            vc.credentialRecord = record;
                        } else if (vc.claimFormat === ClaimFormat.MsoMdoc) {
                            const recordUncast = vc.credentialRecord;
                            const record = new MdocRecord({
                                id: recordUncast.id,
                                createdAt: recordUncast.createdAt,
                                mdoc: Mdoc.fromBase64Url(recordUncast.base64Url)
                            });
                            vc.credentialRecord = record;
                        } else {
                            // eslint-disable-next-line no-console
                            console.log("Unsupported credential format in demo app, only sd-jwt-vc is supported at the moment");
                        }
                    }
                }
            }
        }

        const submissionResult = await this.agent.openid4vc.holder.acceptOpenId4VpAuthorizationRequest({
            authorizationRequestPayload: resolvedPresentationRequest.authorizationRequestPayload,
            presentationExchange: resolvedPresentationRequest.presentationExchange
                ? {
                      credentials: this.agent.openid4vc.holder.selectCredentialsForPresentationExchangeRequest(
                          resolvedPresentationRequest.presentationExchange.credentialsForRequest
                      )
                  }
                : undefined,
            dcql: resolvedPresentationRequest.dcql
                ? {
                      credentials: this.agent.openid4vc.holder.selectCredentialsForDcqlRequest(resolvedPresentationRequest.dcql.queryResult)
                  }
                : undefined
        });
        return submissionResult.serverResponse;
    }

    public async exit(): Promise<any> {
        await this.shutdown();
        process.exit(0);
    }

    public async restart(): Promise<any> {
        await this.shutdown();
    }
}
