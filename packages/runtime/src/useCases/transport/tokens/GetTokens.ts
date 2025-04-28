import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { Result } from "@js-soft/ts-utils";
import { CachedToken, PasswordLocationIndicatorOptions, PasswordProtection, Token, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { nameof } from "ts-simple-nameof";
import { TokenDTO } from "../../../types";
import { OwnerRestriction, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { TokenMapper } from "./TokenMapper";

export interface GetTokensQuery {
    createdAt?: string | string[];
    createdBy?: string | string[];
    createdByDevice?: string | string[];
    expiresAt?: string | string[];
    forIdentity?: string | string[];
    passwordProtection?: "" | "!";
    "passwordProtection.password"?: string | string[];
    "passwordProtection.passwordIsPin"?: "true" | "!";
    "passwordProtection.passwordLocationIndicator"?: string | string[];
}

export interface GetTokensRequest {
    query?: GetTokensQuery;
    ownerRestriction?: OwnerRestriction;
}

class Validator extends SchemaValidator<GetTokensRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetTokensRequest"));
    }
}

export class GetTokensUseCase extends UseCase<GetTokensRequest, TokenDTO[]> {
    private static readonly queryTranslator = new QueryTranslator({
        whitelist: {
            [nameof<TokenDTO>((t) => t.createdAt)]: true,
            [nameof<TokenDTO>((t) => t.createdBy)]: true,
            [nameof<TokenDTO>((t) => t.createdByDevice)]: true,
            [nameof<TokenDTO>((t) => t.expiresAt)]: true,
            [nameof<TokenDTO>((t) => t.forIdentity)]: true,
            [nameof<TokenDTO>((r) => r.passwordProtection)]: true,
            [`${nameof<TokenDTO>((r) => r.passwordProtection)}.password`]: true,
            [`${nameof<TokenDTO>((r) => r.passwordProtection)}.passwordIsPin`]: true,
            [`${nameof<TokenDTO>((r) => r.passwordProtection)}.passwordLocationIndicator`]: true
        },
        alias: {
            [nameof<TokenDTO>((t) => t.createdAt)]: `${nameof<Token>((t) => t.cache)}.${[nameof<CachedToken>((t) => t.createdAt)]}`,
            [nameof<TokenDTO>((t) => t.createdBy)]: `${nameof<Token>((t) => t.cache)}.${[nameof<CachedToken>((t) => t.createdBy)]}`,
            [nameof<TokenDTO>((t) => t.createdByDevice)]: `${nameof<Token>((t) => t.cache)}.${[nameof<CachedToken>((t) => t.createdByDevice)]}`,
            [nameof<TokenDTO>((t) => t.expiresAt)]: `${nameof<Token>((t) => t.cache)}.${[nameof<CachedToken>((t) => t.expiresAt)]}`,
            [nameof<TokenDTO>((t) => t.forIdentity)]: `${nameof<Token>((t) => t.cache)}.${[nameof<CachedToken>((t) => t.forIdentity)]}`,
            [nameof<TokenDTO>((r) => r.passwordProtection)]: nameof<Token>((r) => r.passwordProtection)
        },
        custom: {
            [`${nameof<TokenDTO>((r) => r.passwordProtection)}.password`]: (query: any, input: string) => {
                query[`${nameof<Token>((t) => t.passwordProtection)}.${nameof<PasswordProtection>((t) => t.password)}`] = input;
            },
            [`${nameof<TokenDTO>((t) => t.passwordProtection)}.passwordIsPin`]: (query: any, input: string) => {
                if (input === "true") {
                    query[`${nameof<Token>((t) => t.passwordProtection)}.${nameof<PasswordProtection>((t) => t.passwordType)}`] = {
                        $regex: "^pin"
                    };
                }
                if (input === "!") {
                    query[`${nameof<Token>((t) => t.passwordProtection)}.${nameof<PasswordProtection>((t) => t.passwordType)}`] = "pw";
                }
            },
            [`${nameof<TokenDTO>((r) => r.passwordProtection)}.passwordLocationIndicator`]: (query: any, input: string) => {
                const stringIsNumeric = /^\d+$/.test(input);
                const queryInput = stringIsNumeric ? parseInt(input) : (PasswordLocationIndicatorOptions[input as keyof typeof PasswordLocationIndicatorOptions] ?? -1);
                query[`${nameof<Token>((t) => t.passwordProtection)}.${nameof<PasswordProtection>((t) => t.passwordLocationIndicator)}`] = queryInput;
            }
        }
    });

    public constructor(
        @Inject private readonly tokenController: TokenController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetTokensRequest): Promise<Result<TokenDTO[]>> {
        const query = GetTokensUseCase.queryTranslator.parse(request.query);

        if (request.ownerRestriction) {
            query[nameof<Token>((t) => t.isOwn)] = request.ownerRestriction === OwnerRestriction.Own;
        }

        const tokens = await this.tokenController.getTokens(query);
        return Result.ok(TokenMapper.toTokenDTOList(tokens, false));
    }
}
