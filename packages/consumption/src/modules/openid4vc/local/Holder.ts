import {
    BaseRecord,
    ClaimFormat,
    DcqlCredentialsForRequest,
    DidJwk,
    DidKey,
    DifPexInputDescriptorToCredentials,
    InjectionSymbols,
    JwkDidCreateOptions,
    KeyDidCreateOptions,
    Kms,
    X509Module
} from "@credo-ts/core";
import { OpenId4VciCredentialResponse, OpenId4VcModule, type OpenId4VciResolvedCredentialOffer, type OpenId4VpResolvedAuthorizationRequest } from "@credo-ts/openid4vc";
import { VerifiableCredential } from "@nmshd/content";
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
                console.log(`dynamically trusting certificate ${certificateChain[0].getIssuerNameField("C")} for verification of ${verification.type}`);
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
        if (!resolvedAuthorizationRequest.presentationExchange && !resolvedAuthorizationRequest.dcql) {
            throw new Error("Missing presentation exchange or dcql on resolved authorization request");
        }
        const credentialContent = credential.content.value as VerifiableCredential;
        const credentialRecord = EnmeshedStorageService.fromEncoded(credentialContent.type, credentialContent.value);

        let credentialForPex: DifPexInputDescriptorToCredentials | undefined;
        if (resolvedAuthorizationRequest.presentationExchange) {
            const inputDescriptor = resolvedAuthorizationRequest.presentationExchange.credentialsForRequest.requirements[0].submissionEntry[0].inputDescriptorId;
            credentialForPex = {
                [inputDescriptor]: [
                    {
                        credentialRecord,
                        claimFormat: credentialContent.type as any,
                        disclosedPayload: {} // TODO: implement SD properly
                    }
                ]
            } as any;
        }

        let credentialForDcql: DcqlCredentialsForRequest | undefined;
        if (resolvedAuthorizationRequest.dcql) {
            const queryId = resolvedAuthorizationRequest.dcql.queryResult.credentials[0].id;
            credentialForDcql = {
                [queryId]: [
                    {
                        credentialRecord,
                        claimFormat: credentialContent.type as any,
                        disclosedPayload: {} // TODO: implement SD properly
                    }
                ]
            } as any;
        }

        const submissionResult = await this.agent.openid4vc.holder.acceptOpenId4VpAuthorizationRequest({
            authorizationRequestPayload: resolvedAuthorizationRequest.authorizationRequestPayload,
            presentationExchange: credentialForPex ? { credentials: credentialForPex } : undefined,
            dcql: credentialForDcql ? { credentials: credentialForDcql } : undefined
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
