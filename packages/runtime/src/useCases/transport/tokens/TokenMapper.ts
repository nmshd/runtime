import { Token } from "@nmshd/transport";
import { TokenDTO } from "../../../types";
import { PasswordProtectionMapper, RuntimeErrors } from "../../common";

export class TokenMapper {
    public static toTokenDTO(token: Token, ephemeral: boolean): TokenDTO {
        if (!token.cache) {
            throw RuntimeErrors.general.cacheEmpty(Token, token.id.toString());
        }

        const reference = token.toTokenReference();

        return {
            id: token.id.toString(),
            createdBy: token.cache.createdBy.toString(),
            createdByDevice: token.cache.createdByDevice.toString(),
            content: token.cache.content.toJSON(),
            createdAt: token.cache.createdAt.toString(),
            expiresAt: token.cache.expiresAt.toString(),
            truncatedReference: reference.truncate(),
            isEphemeral: ephemeral,
            forIdentity: token.cache.forIdentity?.toString(),
            passwordProtection: PasswordProtectionMapper.toPasswordProtectionDTO(token.passwordProtection)
        };
    }

    public static toTokenDTOList(tokens: Token[], ephemeral: boolean): TokenDTO[] {
        return tokens.map((t) => TokenMapper.toTokenDTO(t, ephemeral));
    }
}
