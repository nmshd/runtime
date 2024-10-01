import { Serializable } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CryptoCipher, CryptoSecretKey } from "@nmshd/crypto";
import { CoreCrypto, IConfig, ICorrelator, TransportCoreErrors } from "../../core";
import { AnonymousTokenClient } from "./backbone/AnonymousTokenClient";
import { CachedToken } from "./local/CachedToken";
import { Token } from "./local/Token";
import { TokenReference } from "./transmission/TokenReference";

export class AnonymousTokenController {
    private readonly client: AnonymousTokenClient;
    public constructor(config: IConfig, correlator?: ICorrelator) {
        this.client = new AnonymousTokenClient(config, correlator);
    }

    public async loadPeerTokenByTruncated(truncated: string): Promise<Token> {
        const reference = TokenReference.fromTruncated(truncated);
        return await this.loadPeerToken(reference.id, reference.key, reference.forIdentityTruncated);
    }

    private async loadPeerToken(id: CoreId, secretKey: CryptoSecretKey, forIdentityTruncated?: string): Promise<Token> {
        if (forIdentityTruncated) {
            throw TransportCoreErrors.general.notIntendedForYou(id.toString());
        }

        const response = (await this.client.getToken(id.toString())).value;

        const cipher = CryptoCipher.fromBase64(response.content);
        const plaintextTokenBuffer = await CoreCrypto.decrypt(cipher, secretKey);
        const plaintextTokenContent = Serializable.deserializeUnknown(plaintextTokenBuffer.toUtf8());

        if (!(plaintextTokenContent instanceof Serializable)) {
            throw TransportCoreErrors.tokens.invalidTokenContent(id.toString());
        }
        const token = Token.from({
            id: id,
            secretKey: secretKey,
            isOwn: false
        });

        const cachedToken = CachedToken.from({
            createdAt: CoreDate.from(response.createdAt),
            expiresAt: CoreDate.from(response.expiresAt),
            createdBy: CoreAddress.from(response.createdBy),
            createdByDevice: CoreId.from(response.createdByDevice),
            content: plaintextTokenContent
        });
        token.setCache(cachedToken);

        return token;
    }
}
