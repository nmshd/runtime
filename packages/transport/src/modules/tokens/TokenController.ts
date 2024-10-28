import { ISerializable, Serializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoCipher, CryptoSecretKey } from "@nmshd/crypto";
import { CoreCrypto, TransportCoreErrors, TransportError } from "../../core";
import { DbCollectionName } from "../../core/DbCollectionName";
import { ControllerName, TransportController } from "../../core/TransportController";
import { AccountController } from "../accounts/AccountController";
import { SynchronizedCollection } from "../sync/SynchronizedCollection";
import { BackboneGetTokensResponse } from "./backbone/BackboneGetTokens";
import { TokenClient } from "./backbone/TokenClient";
import { CachedToken } from "./local/CachedToken";
import { ISendTokenParameters, SendTokenParameters } from "./local/SendTokenParameters";
import { Token } from "./local/Token";
import { TokenReference } from "./transmission/TokenReference";

export class TokenController extends TransportController {
    private client: TokenClient;
    private tokens: SynchronizedCollection;

    public constructor(parent: AccountController) {
        super(ControllerName.Token, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.client = new TokenClient(this.config, this.parent.authenticator, this.transport.correlator);
        this.tokens = await this.parent.getSynchronizedCollection(DbCollectionName.Tokens);

        return this;
    }

    public async getTokens(query?: any): Promise<Token[]> {
        const items = await this.tokens.find(query);
        return this.parseArray<Token>(items, Token);
    }

    public async sendToken(parameters: ISendTokenParameters): Promise<Token> {
        const input = SendTokenParameters.from(parameters);
        const secretKey = await CoreCrypto.generateSecretKey();
        const serializedToken = input.content.serialize();
        const serializedTokenBuffer = CoreBuffer.fromUtf8(serializedToken);

        const cipher = await CoreCrypto.encrypt(serializedTokenBuffer, secretKey);

        const response = (
            await this.client.createToken({
                content: cipher.toBase64(),
                expiresAt: input.expiresAt.toString(),
                forIdentity: input.forIdentity?.toString()
            })
        ).value;

        const cachedToken = CachedToken.from({
            createdAt: CoreDate.from(response.createdAt),
            expiresAt: input.expiresAt,
            createdBy: this.parent.identity.address,
            createdByDevice: this.parent.activeDevice.id,
            content: input.content,
            forIdentity: input.forIdentity
        });

        const token = Token.from({
            id: CoreId.from(response.id),
            secretKey: secretKey,
            isOwn: true,
            cache: cachedToken,
            cachedAt: CoreDate.utc()
        });

        if (!input.ephemeral) {
            await this.tokens.create(token);
        }

        return token;
    }

    @log()
    public async setTokenMetadata(idOrToken: CoreId | Token, metadata: ISerializable): Promise<Token> {
        const id = idOrToken instanceof CoreId ? idOrToken.toString() : idOrToken.id.toString();
        const tokenDoc = await this.tokens.read(id);
        if (!tokenDoc) {
            throw TransportCoreErrors.general.recordNotFound(Token, id.toString());
        }

        const token = Token.from(tokenDoc);
        token.setMetadata(metadata);
        await this.tokens.update(tokenDoc, token);

        return token;
    }

    public async getToken(id: CoreId): Promise<Token | undefined> {
        const tokenDoc = await this.tokens.read(id.toString());
        return tokenDoc ? Token.from(tokenDoc) : undefined;
    }

    public async updateCache(ids: string[]): Promise<Token[]> {
        if (ids.length < 1) {
            return [];
        }

        const resultItems = (await this.client.getTokens({ ids })).value;
        const promises = [];
        for await (const resultItem of resultItems) {
            promises.push(this.updateCacheOfExistingTokenInDb(resultItem.id, resultItem));
        }

        const isToken = (item: Token | undefined): item is Token => !!item;
        return (await Promise.all(promises)).filter(isToken);
    }

    public async fetchCaches(ids: CoreId[]): Promise<{ id: CoreId; cache: CachedToken }[]> {
        if (ids.length === 0) return [];

        const backboneTokens = await (await this.client.getTokens({ ids: ids.map((id) => id.id) })).value.collect();

        const decryptionPromises = backboneTokens.map(async (t) => {
            const tokenDoc = await this.tokens.read(t.id);
            if (!tokenDoc) {
                this._log.error(
                    `Token '${t.id}' not found in local database and the cache fetching was therefore skipped. This should not happen and might be a bug in the application logic.`
                );
                return;
            }

            const token = Token.from(tokenDoc);

            return { id: CoreId.from(t), cache: await this.decryptToken(t, token.secretKey) };
        });

        const caches = await Promise.all(decryptionPromises);
        return caches.filter((c) => c !== undefined);
    }

    @log()
    private async updateCacheOfExistingTokenInDb(id: string, response?: BackboneGetTokensResponse) {
        const tokenDoc = await this.tokens.read(id);
        if (!tokenDoc) {
            TransportCoreErrors.general.recordNotFound(Token, id);
            return;
        }

        const token = Token.from(tokenDoc);

        await this.updateCacheOfToken(token, response);
        await this.tokens.update(tokenDoc, token);
        return token;
    }

    private async updateCacheOfToken(token: Token, response?: BackboneGetTokensResponse): Promise<void> {
        const tokenId = token.id.toString();

        if (!response) {
            response = (await this.client.getToken(tokenId)).value;
        }

        const cachedToken = await this.decryptToken(response, token.secretKey);
        token.setCache(cachedToken);

        // Update isOwn, as it is possible that the identity receives an own token
        token.isOwn = this.parent.identity.isMe(cachedToken.createdBy);
    }

    @log()
    private async decryptToken(response: BackboneGetTokensResponse, secretKey: CryptoSecretKey) {
        const cipher = CryptoCipher.fromBase64(response.content);
        const plaintextTokenBuffer = await CoreCrypto.decrypt(cipher, secretKey);
        const plaintextTokenContent = Serializable.deserializeUnknown(plaintextTokenBuffer.toUtf8());

        if (!(plaintextTokenContent instanceof Serializable)) {
            throw TransportCoreErrors.tokens.invalidTokenContent(response.id);
        }

        const cachedToken = CachedToken.from({
            createdAt: CoreDate.from(response.createdAt),
            expiresAt: CoreDate.from(response.expiresAt),
            createdBy: CoreAddress.from(response.createdBy),
            createdByDevice: CoreId.from(response.createdByDevice),
            content: plaintextTokenContent,
            forIdentity: response.forIdentity ? CoreAddress.from(response.forIdentity) : undefined
        });
        return cachedToken;
    }

    public async loadPeerTokenByTruncated(truncated: string, ephemeral: boolean): Promise<Token> {
        const reference = TokenReference.fromTruncated(truncated);
        return await this.loadPeerToken(reference.id, reference.key, ephemeral, reference.forIdentityTruncated);
    }

    private async loadPeerToken(id: CoreId, secretKey: CryptoSecretKey, ephemeral: boolean, forIdentityTruncated?: string): Promise<Token> {
        const tokenDoc = await this.tokens.read(id.toString());
        if (!tokenDoc && forIdentityTruncated && !this.parent.identity.address.toString().endsWith(forIdentityTruncated)) {
            throw TransportCoreErrors.general.notIntendedForYou(id.toString());
        }

        if (tokenDoc) {
            let token: Token | undefined = Token.from(tokenDoc);
            if (token.cache) {
                return token;
            }

            token = await this.updateCacheOfExistingTokenInDb(id.toString());
            if (!token) {
                // This should not happen, we only update the cache if we found the tokenDoc
                throw new TransportError(`Tried to update a token (with ID: '${id.toString()}') that doesn't exist in the local database.`);
            }

            return token;
        }

        const token = Token.from({
            id: id,
            secretKey: secretKey,
            isOwn: false
        });

        await this.updateCacheOfToken(token);

        if (!ephemeral) {
            await this.tokens.create(token);
        }

        return token;
    }

    public async cleanupTokensOfDecomposedRelationship(peer: CoreAddress): Promise<void> {
        const tokenDocs = await this.getTokens({ "cache.createdBy": peer.toString() });
        const tokens = this.parseArray<Token>(tokenDocs, Token);
        for (const token of tokens) {
            await this.tokens.delete(token);
        }
    }
}
