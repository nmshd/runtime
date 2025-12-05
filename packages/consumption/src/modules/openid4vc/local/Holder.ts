import { BaseRecord, ClaimFormat, DidJwk, DidKey, InjectionSymbols, JwkDidCreateOptions, KeyDidCreateOptions, Kms, MdocRecord, SdJwtVcRecord, X509Module } from "@credo-ts/core";
import { OpenId4VciCredentialResponse, OpenId4VcModule, type OpenId4VciResolvedCredentialOffer, type OpenId4VpResolvedAuthorizationRequest } from "@credo-ts/openid4vc";
import { AccountController } from "@nmshd/transport";
import { AttributesController, OwnIdentityAttribute } from "../../attributes";
import { BaseAgent } from "./BaseAgent";
import { EnmeshedStorageService } from "./EnmeshedStorageService";
import { KeyStorage } from "./KeyStorage";
import { OpenId4VciCredentialResponseJSON } from "./OpenId4VciCredentialResponseJSON";

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

    public constructor(keyStorage: KeyStorage, accountController: AccountController, attributeController: AttributesController, fetchInstance: typeof fetch) {
        super(keyStorage, getOpenIdHolderModules(), accountController, attributeController, fetchInstance);
    }

    public async resolveCredentialOffer(credentialOffer: string): Promise<OpenId4VciResolvedCredentialOffer> {
        return await this.agent.openid4vc.holder.resolveCredentialOffer(credentialOffer);
    }

    public async requestCredentials(
        resolvedCredentialOffer: OpenId4VciResolvedCredentialOffer,
        options: {
            credentialConfigurationIds: string[];
            txCode?: string;
        }
    ): Promise<OpenId4VciCredentialResponse[]> {
        const tokenResponse = await this.agent.openid4vc.holder.requestToken({
            resolvedCredentialOffer,
            txCode: options.txCode
        });

        const credentialResponse = await this.agent.openid4vc.holder.requestCredentials({
            resolvedCredentialOffer,
            credentialConfigurationIds: options.credentialConfigurationIds,
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

        return credentialResponse.credentials;
    }

    public async storeCredentials(credentialResponses: OpenId4VciCredentialResponseJSON[]): Promise<OwnIdentityAttribute[]> {
        const storedCredentials = await Promise.all(
            credentialResponses.map((credentialResponse) => {
                if (![ClaimFormat.SdJwtW3cVc, ClaimFormat.SdJwtDc, ClaimFormat.MsoMdoc].includes(credentialResponse.claimFormat)) {
                    throw new Error("Unsupported credential format");
                }

                const enmeshedStorageService = this.agent.dependencyManager.resolve<EnmeshedStorageService<BaseRecord>>(InjectionSymbols.StorageService);

                return enmeshedStorageService.saveWithDisplay(
                    this.agent.context,
                    credentialResponse.encoded,
                    credentialResponse.claimFormat,
                    credentialResponse.displayInformation
                );
            })
        );

        this.agent.config.logger.info(`Stored credentials: ${JSON.stringify(storedCredentials)}`);
        return storedCredentials;
    }

    public async resolveAuthorizationRequest(request: string): Promise<OpenId4VpResolvedAuthorizationRequest> {
        const resolvedRequest = await this.agent.openid4vc.holder.resolveOpenId4VpAuthorizationRequest(request);
        return resolvedRequest;
    }

    public async acceptAuthorizationRequest(resolvedAuthenticationRequest: OpenId4VpResolvedAuthorizationRequest): Promise<
        | {
              readonly status: number;
              readonly body: string | Record<string, unknown> | null;
          }
        | {
              readonly status: number;
              readonly body: Record<string, unknown>;
          }
        | undefined
    > {
        if (!resolvedAuthenticationRequest.presentationExchange && !resolvedAuthenticationRequest.dcql) {
            throw new Error("Missing presentation exchange or dcql on resolved authorization request");
        }

        // This fix ensures that the credential records which have been loaded here actually do provide the encoded() method
        // this issue arises as the records are loaded and then communicated to the app as a json object, losing the class prototype
        if (resolvedAuthenticationRequest.presentationExchange) {
            for (const requirementKey in resolvedAuthenticationRequest.presentationExchange.credentialsForRequest.requirements) {
                const requirement = resolvedAuthenticationRequest.presentationExchange.credentialsForRequest.requirements[requirementKey];
                for (const submissionEntry of requirement.submissionEntry) {
                    for (const vc of submissionEntry.verifiableCredentials) {
                        if (vc.claimFormat === ClaimFormat.SdJwtDc) {
                            const recordUncast = vc.credentialRecord;
                            const record = new SdJwtVcRecord({
                                id: recordUncast.id,
                                createdAt: recordUncast.createdAt,
                                credentialInstances: [{ compactSdJwtVc: recordUncast.encoded }]
                            });
                            vc.credentialRecord = record;
                        } else if (vc.claimFormat === ClaimFormat.MsoMdoc) {
                            const recordUncast = vc.credentialRecord;
                            const record = new MdocRecord({
                                id: recordUncast.id,
                                createdAt: recordUncast.createdAt,
                                credentialInstances: [{ issuerSignedBase64Url: recordUncast.encoded }]
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
            authorizationRequestPayload: resolvedAuthenticationRequest.authorizationRequestPayload,
            presentationExchange: resolvedAuthenticationRequest.presentationExchange
                ? {
                      credentials: this.agent.openid4vc.holder.selectCredentialsForPresentationExchangeRequest(
                          resolvedAuthenticationRequest.presentationExchange.credentialsForRequest
                      )
                  }
                : undefined,
            dcql: resolvedAuthenticationRequest.dcql
                ? {
                      credentials: this.agent.openid4vc.holder.selectCredentialsForDcqlRequest(resolvedAuthenticationRequest.dcql.queryResult)
                  }
                : undefined
        });
        return submissionResult.serverResponse;
    }

    public async exit(): Promise<void> {
        await this.shutdown();
    }

    public async restart(): Promise<void> {
        await this.shutdown();
    }
}
