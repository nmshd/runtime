import {
    BaseRecord,
    ClaimFormat,
    DcqlCredentialsForRequest,
    DidJwk,
    DidKey,
    InjectionSymbols,
    JwkDidCreateOptions,
    KeyDidCreateOptions,
    Kms,
    SdJwtVcApi,
    X509Module
} from "@credo-ts/core";
import { OpenId4VciCredentialResponse, OpenId4VcModule, type OpenId4VciResolvedCredentialOffer, type OpenId4VpResolvedAuthorizationRequest } from "@credo-ts/openid4vc";
import { TokenContentVerifiablePresentation, VerifiableCredential } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { AttributesController, OwnIdentityAttribute } from "../../attributes";
import { BaseAgent } from "./BaseAgent";
import { decodeRecord, EnmeshedStorageService } from "./EnmeshedStorageService";
import { KeyStorage } from "./KeyStorage";
import { OpenId4VciCredentialResponseJSON } from "./OpenId4VciCredentialResponseJSON";

function getOpenIdHolderModules() {
    return {
        openid4vc: new OpenId4VcModule(),
        x509: new X509Module({
            getTrustedCertificatesForVerification: (_agentContext, { certificateChain }) => {
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
        credentialConfigurationIds: string[],
        access: { accessToken: string } | { pinCode?: string }
    ): Promise<OpenId4VciCredentialResponse[]> {
        const tokenResponse =
            "accessToken" in access
                ? {
                      accessToken: access.accessToken,
                      accessTokenResponse: {
                          // eslint-disable-next-line @typescript-eslint/naming-convention
                          access_token: access.accessToken,
                          // eslint-disable-next-line @typescript-eslint/naming-convention
                          token_type: "bearer"
                      }
                  }
                : await this.agent.openid4vc.holder.requestToken({ resolvedCredentialOffer, txCode: access.pinCode });

        const credentialResponse = await this.agent.openid4vc.holder.requestCredentials({
            resolvedCredentialOffer,
            credentialConfigurationIds: credentialConfigurationIds,
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
                if (![ClaimFormat.SdJwtDc].includes(credentialResponse.claimFormat)) {
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

    public async acceptAuthorizationRequest(
        resolvedAuthorizationRequest: OpenId4VpResolvedAuthorizationRequest,
        credential: OwnIdentityAttribute
    ): Promise<
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
        if (!resolvedAuthorizationRequest.dcql) {
            throw new Error("Missing dcql on resolved authorization request");
        }

        const credentialContent = credential.content.value as VerifiableCredential;
        const credentialRecord = decodeRecord(credentialContent.type, credentialContent.value);

        let credentialForDcql: DcqlCredentialsForRequest | undefined;

        const queryId = resolvedAuthorizationRequest.dcql.queryResult.credentials[0].id;
        credentialForDcql = {
            [queryId]: [
                {
                    credentialRecord,
                    claimFormat: credentialContent.type as any,
                    disclosedPayload: {}
                }
            ]
        } as any;

        const submissionResult = await this.agent.openid4vc.holder.acceptOpenId4VpAuthorizationRequest({
            authorizationRequestPayload: resolvedAuthorizationRequest.authorizationRequestPayload,
            presentationExchange: undefined,
            dcql: credentialForDcql ? { credentials: credentialForDcql } : undefined
        });
        return submissionResult.serverResponse;
    }

    public async createPresentationTokenContent(credential: VerifiableCredential, nonce: string): Promise<TokenContentVerifiablePresentation> {
        if (credential.type !== ClaimFormat.SdJwtDc) throw new Error("Only SD-JWT credentials are supported for token presentation");

        const sdJwtVcApi = this.agent.dependencyManager.resolve(SdJwtVcApi);
        const presentation = await sdJwtVcApi.present({
            sdJwtVc: sdJwtVcApi.fromCompact(credential.value as string),
            verifierMetadata: {
                audience: "defaultPresentationAudience",
                issuedAt: Date.now() / 1000,
                nonce
            }
        });

        return TokenContentVerifiablePresentation.from({
            value: presentation,
            type: credential.type,
            displayInformation: credential.displayInformation
        });
    }

    public async verifyPresentationTokenContent(tokenContent: TokenContentVerifiablePresentation, expectedNonce: string): Promise<{ isValid: boolean; error?: Error }> {
        if (tokenContent.type !== ClaimFormat.SdJwtDc) throw new Error("Only SD-JWT credentials are supported for token presentation");

        const sdJwtVcApi = this.agent.dependencyManager.resolve(SdJwtVcApi);
        const verificationResult = await sdJwtVcApi.verify({
            compactSdJwtVc: tokenContent.value as string,
            keyBinding: {
                audience: "defaultPresentationAudience",
                nonce: expectedNonce
            }
        });

        return { isValid: verificationResult.isValid, error: "error" in verificationResult ? verificationResult.error : undefined };
    }

    public async exit(): Promise<void> {
        await this.shutdown();
    }

    public async restart(): Promise<void> {
        await this.shutdown();
    }
}
