import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { Result } from "@js-soft/ts-utils";
import { CachedToken, Token, TokenController } from "@nmshd/transport";
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
            [nameof<TokenDTO>((t) => t.forIdentity)]: true
        },
        alias: {
            [nameof<TokenDTO>((t) => t.createdAt)]: `${nameof<Token>((t) => t.cache)}.${[nameof<CachedToken>((t) => t.createdAt)]}`,
            [nameof<TokenDTO>((t) => t.createdBy)]: `${nameof<Token>((t) => t.cache)}.${[nameof<CachedToken>((t) => t.createdBy)]}`,
            [nameof<TokenDTO>((t) => t.createdByDevice)]: `${nameof<Token>((t) => t.cache)}.${[nameof<CachedToken>((t) => t.createdByDevice)]}`,
            [nameof<TokenDTO>((t) => t.expiresAt)]: `${nameof<Token>((t) => t.cache)}.${[nameof<CachedToken>((t) => t.expiresAt)]}`,
            [nameof<TokenDTO>((t) => t.forIdentity)]: `${nameof<Token>((t) => t.cache)}.${[nameof<CachedToken>((t) => t.forIdentity)]}`
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
