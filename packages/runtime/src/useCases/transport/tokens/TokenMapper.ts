import { TokenDTO } from "@nmshd/runtime-types";
import { Token } from "@nmshd/transport";
import { Container } from "@nmshd/typescript-ioc";
import { ConfigHolder } from "../../../ConfigHolder";
import { PasswordProtectionMapper } from "../../common";

export class TokenMapper {
    public static toTokenDTO(token: Token, ephemeral: boolean): TokenDTO {
        const backboneBaseUrl = Container.get<ConfigHolder>(ConfigHolder).getConfig().transportLibrary.baseUrl;
        const reference = token.toTokenReference(backboneBaseUrl);

        return {
            id: token.id.toString(),
            isOwn: token.isOwn,
            createdBy: token.createdBy.toString(),
            createdByDevice: token.createdByDevice.toString(),
            content: token.content.toJSON(),
            createdAt: token.createdAt.toString(),
            expiresAt: token.expiresAt.toString(),
            forIdentity: token.forIdentity?.toString(),
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
