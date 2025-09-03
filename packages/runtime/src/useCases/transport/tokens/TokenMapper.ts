import { EmptyTokenDTO, TokenDTO } from "@nmshd/runtime-types";
import { EmptyToken, Token } from "@nmshd/transport";
import { Container } from "@nmshd/typescript-ioc";
import { ConfigHolder } from "../../../ConfigHolder";
import { PasswordProtectionMapper, RuntimeErrors } from "../../common";

export class TokenMapper {
    public static toTokenDTO(token: Token, ephemeral: boolean): TokenDTO {
        if (!token.cache) {
            throw RuntimeErrors.general.cacheEmpty(Token, token.id.toString());
        }

        const backboneBaseUrl = Container.get<ConfigHolder>(ConfigHolder).getConfig().transportLibrary.baseUrl;
        const reference = token.toTokenReference(backboneBaseUrl);

        return {
            id: token.id.toString(),
            isOwn: token.isOwn,
            createdBy: token.cache.createdBy.toString(),
            createdByDevice: token.cache.createdByDevice.toString(),
            content: token.cache.content.toJSON(),
            createdAt: token.cache.createdAt.toString(),
            expiresAt: token.cache.expiresAt.toString(),
            forIdentity: token.cache.forIdentity?.toString(),
            passwordProtection: PasswordProtectionMapper.toPasswordProtectionDTO(token.passwordProtection),
            truncatedReference: reference.truncate(),
            reference: {
                truncated: reference.truncate(),
                url: reference.toUrl()
            },
            isEphemeral: ephemeral
        };
    }

    public static toEmptyTokenDTO(token: EmptyToken, ephemeral: boolean): EmptyTokenDTO {
        const backboneBaseUrl = Container.get<ConfigHolder>(ConfigHolder).getConfig().transportLibrary.baseUrl;
        const reference = token.toTokenReference(backboneBaseUrl);

        return {
            id: token.id.toString(),
            expiresAt: token.expiresAt.toString(),
            passwordProtection: PasswordProtectionMapper.toPasswordProtectionDTO(token.passwordProtection),
            reference: {
                truncated: reference.truncate(),
                url: reference.toUrl()
            },
            isEphemeral: ephemeral
        };
    }

    public static toTokenDTOList(tokens: Token[], ephemeral: boolean): TokenDTO[] {
        return tokens.map((t) => this.toTokenDTO(t, ephemeral));
    }
}
