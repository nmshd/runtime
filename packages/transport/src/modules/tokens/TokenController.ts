import { ISerializable, Serializable } from "@js-soft/ts-serval";
import { log } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoCipher, CryptoSecretKey } from "@nmshd/crypto";
import { DbCollectionName } from "../../core/DbCollectionName.js";
import { CoreCrypto, TransportCoreErrors } from "../../core/index.js";
import { ControllerName, TransportController } from "../../core/TransportController.js";
import { PasswordProtection } from "../../core/types/PasswordProtection.js";
import { AccountController } from "../accounts/AccountController.js";
import { SynchronizedCollection } from "../sync/SynchronizedCollection.js";
import { BackboneGetTokensResponse } from "./backbone/BackboneGetTokens.js";
import { TokenClient } from "./backbone/TokenClient.js";
import { ISendTokenParameters, SendTokenParameters } from "./local/SendTokenParameters.js";
import { Token } from "./local/Token.js";
import { IUpdateTokenContentParameters, UpdateTokenContentParameters } from "./local/UpdateTokenContentParameters.js";
import { TokenReference } from "./transmission/TokenReference.js";

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

        const password = parameters.passwordProtection?.password;
        const salt = password ? await CoreCrypto.random(16) : undefined;
        const hashedPassword = password && salt ? (await CoreCrypto.deriveHashOutOfPassword(password, salt)).toBase64() : undefined;

        const response = (
            await this.client.createToken({
                content: cipher.toBase64(),
                expiresAt: input.expiresAt.toString(),
                forIdentity: input.forIdentity?.toString(),
                password: hashedPassword
            })
        ).value;

        const passwordProtection = parameters.passwordProtection
            ? PasswordProtection.from({
                  password: parameters.passwordProtection.password,
                  passwordType: parameters.passwordProtection.passwordType,
                  salt: salt!,
                  passwordLocationIndicator: parameters.passwordProtection.passwordLocationIndicator
              })
            : undefined;

        const token = Token.from({
            id: CoreId.from(response.id),
            secretKey: secretKey,
            isOwn: true,
            passwordProtection,
            createdAt: CoreDate.from(response.createdAt),
            expiresAt: input.expiresAt,
            createdBy: this.parent.identity.address,
            createdByDevice: this.parent.activeDevice.id,
            content: input.content,
            forIdentity: input.forIdentity
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

    public async loadPeerTokenByReference(reference: TokenReference, ephemeral: boolean, password?: string): Promise<Token> {
        if (reference.passwordProtection && !reference.passwordProtection.password && !password) throw TransportCoreErrors.general.noPasswordProvided();
        const passwordProtection = reference.passwordProtection
            ? PasswordProtection.from({
                  salt: reference.passwordProtection.salt,
                  passwordType: reference.passwordProtection.passwordType,
                  password: (password ?? reference.passwordProtection.password)!,
                  passwordLocationIndicator: reference.passwordProtection.passwordLocationIndicator
              })
            : undefined;

        return await this.loadPeerToken(reference.id, reference.key, ephemeral, reference.forIdentityTruncated, passwordProtection);
    }

    private async loadPeerToken(
        id: CoreId,
        secretKey: CryptoSecretKey,
        ephemeral: boolean,
        forIdentityTruncated?: string,
        passwordProtection?: PasswordProtection
    ): Promise<Token> {
        const tokenDoc = await this.tokens.read(id.toString());
        if (!tokenDoc && forIdentityTruncated && !this.parent.identity.address.toString().endsWith(forIdentityTruncated)) {
            throw TransportCoreErrors.general.notIntendedForYou(id.toString());
        }

        if (tokenDoc) {
            const token = Token.from(tokenDoc);
            return token;
        }

        const backboneResult = await this.client.getToken(
            id.toString(),
            passwordProtection ? (await CoreCrypto.deriveHashOutOfPassword(passwordProtection.password, passwordProtection.salt)).toBase64() : undefined
        );

        const backboneToken = backboneResult.value;
        if (!backboneToken.content || !backboneToken.createdBy || !backboneToken.createdByDevice) throw TransportCoreErrors.tokens.emptyToken(backboneToken.id);

        const tokenContent = await this.decryptTokenContent(backboneToken, secretKey);

        const token = Token.from({
            id: id,
            secretKey: secretKey,
            isOwn: false,
            passwordProtection,
            createdAt: CoreDate.from(backboneToken.createdAt),
            expiresAt: CoreDate.from(backboneToken.expiresAt),
            createdBy: CoreAddress.from(backboneToken.createdBy),
            createdByDevice: CoreId.from(backboneToken.createdByDevice),
            forIdentity: backboneToken.forIdentity ? CoreAddress.from(backboneToken.forIdentity) : undefined,
            content: tokenContent
        });

        if (!ephemeral) {
            await this.tokens.create(token);
        }

        return token;
    }

    @log()
    private async decryptTokenContent(backboneToken: BackboneGetTokensResponse, secretKey: CryptoSecretKey) {
        if (!backboneToken.content) throw TransportCoreErrors.tokens.emptyToken(backboneToken.id);

        const cipher = CryptoCipher.fromBase64(backboneToken.content);
        const plaintextTokenBuffer = await CoreCrypto.decrypt(cipher, secretKey);
        const plaintextTokenContent = Serializable.deserializeUnknown(plaintextTokenBuffer.toUtf8());

        if (!(plaintextTokenContent instanceof Serializable)) {
            throw TransportCoreErrors.tokens.invalidTokenContent(backboneToken.id);
        }

        return plaintextTokenContent;
    }

    public async cleanupTokensOfDecomposedRelationship(peer: CoreAddress): Promise<void> {
        const tokens = await this.getTokens({ createdBy: peer.toString() });
        for (const token of tokens) {
            await this.tokens.delete(token);
        }
    }

    public async delete(token: Token): Promise<void> {
        if (token.isOwn) {
            const response = await this.client.deleteToken(token.id.toString());
            if (response.isError) throw response.error;
        }

        await this.tokens.delete(token);
    }

    public async updateTokenContent(parameters: IUpdateTokenContentParameters): Promise<Token> {
        const input = UpdateTokenContentParameters.from(parameters);
        const serializedToken = input.content.serialize();
        const serializedTokenBuffer = CoreBuffer.fromUtf8(serializedToken);

        const cipher = await CoreCrypto.encrypt(serializedTokenBuffer, input.secretKey);

        const password = parameters.passwordProtection.password;
        if (!password) throw TransportCoreErrors.general.noPasswordProvided();

        const hashedPassword = (await CoreCrypto.deriveHashOutOfPassword(password, input.passwordProtection.salt)).toBase64();

        const response = (await this.client.updateTokenContent({ id: parameters.id.toString(), newContent: cipher.toBase64(), password: hashedPassword })).value;

        const passwordProtection = PasswordProtection.from({
            password,
            passwordType: parameters.passwordProtection.passwordType,
            salt: parameters.passwordProtection.salt,
            passwordLocationIndicator: parameters.passwordProtection.passwordLocationIndicator
        });

        const token = Token.from({
            id: CoreId.from(response.id),
            secretKey: input.secretKey,
            isOwn: true,
            passwordProtection,
            createdAt: CoreDate.from(response.createdAt),
            expiresAt: CoreDate.from(response.expiresAt),
            createdBy: this.parent.identity.address,
            createdByDevice: this.parent.activeDevice.id,
            content: input.content
        });

        return token;
    }

    public async isEmptyToken(reference: TokenReference): Promise<boolean> {
        if (!reference.passwordProtection?.password) throw TransportCoreErrors.general.noPasswordProvided();

        const hashedPassword = (await CoreCrypto.deriveHashOutOfPassword(reference.passwordProtection.password, reference.passwordProtection.salt)).toBase64();
        const response = (await this.client.getToken(reference.id.toString(), hashedPassword)).value;

        return !response.content;
    }
}
