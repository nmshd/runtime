import { Serializable } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CryptoCipher, CryptoSecretKey } from "@nmshd/crypto";
import { CoreCrypto, IConfig, ICorrelator, TransportCoreErrors } from "../../core";
import { PasswordProtection } from "../../core/types/PasswordProtection";
import { AnonymousTokenClient } from "./backbone/AnonymousTokenClient";
import { Token } from "./local/Token";
import { TokenReference } from "./transmission/TokenReference";

export class AnonymousTokenController {
    private readonly client: AnonymousTokenClient;
    public constructor(config: IConfig, correlator?: ICorrelator) {
        this.client = new AnonymousTokenClient(config, correlator);
    }

    public async loadPeerTokenByReference(reference: TokenReference, password?: string): Promise<Token> {
        if (reference.passwordProtection && !password) throw TransportCoreErrors.general.noPasswordProvided();
        const passwordProtection = reference.passwordProtection
            ? PasswordProtection.from({
                  salt: reference.passwordProtection.salt,
                  passwordType: reference.passwordProtection.passwordType,
                  password: password!,
                  passwordLocationIndicator: reference.passwordProtection.passwordLocationIndicator
              })
            : undefined;

        return await this.loadPeerToken(reference.id, reference.key, reference.forIdentityTruncated, passwordProtection);
    }

    private async loadPeerToken(id: CoreId, secretKey: CryptoSecretKey, forIdentityTruncated?: string, passwordProtection?: PasswordProtection): Promise<Token> {
        if (forIdentityTruncated) {
            throw TransportCoreErrors.general.notIntendedForYou(id.toString());
        }

        const hashedPassword = passwordProtection ? (await CoreCrypto.deriveHashOutOfPassword(passwordProtection.password, passwordProtection.salt)).toBase64() : undefined;
        const response = (await this.client.getToken(id.toString(), hashedPassword)).value;

        const cipher = CryptoCipher.fromBase64(response.content);
        const plaintextTokenBuffer = await CoreCrypto.decrypt(cipher, secretKey);
        const plaintextTokenContent = Serializable.deserializeUnknown(plaintextTokenBuffer.toUtf8());

        if (!(plaintextTokenContent instanceof Serializable)) {
            throw TransportCoreErrors.tokens.invalidTokenContent(id.toString());
        }
        const token = Token.from({
            id: id,
            secretKey: secretKey,
            isOwn: false,
            passwordProtection,
            createdAt: CoreDate.from(response.createdAt),
            expiresAt: CoreDate.from(response.expiresAt),
            createdBy: CoreAddress.from(response.createdBy),
            createdByDevice: CoreId.from(response.createdByDevice),
            content: plaintextTokenContent
        });

        return token;
    }
}
