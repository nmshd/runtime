import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { Result } from "@js-soft/ts-utils";
import { CachedRelationshipTemplate, PasswordProtection, RelationshipTemplate, RelationshipTemplateController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { nameof } from "ts-simple-nameof";
import { RelationshipTemplateDTO } from "../../../types";
import { OwnerRestriction, PasswordProtectionMapper, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RelationshipTemplateMapper } from "./RelationshipTemplateMapper";

export interface GetRelationshipTemplatesQuery {
    isOwn?: string | string[];
    createdAt?: string | string[];
    expiresAt?: string | string[];
    createdBy?: string | string[];
    createdByDevice?: string | string[];
    maxNumberOfAllocations?: string | string[];
    forIdentity?: string | string[];
    passwordProtection?: "" | "!";
    "passwordProtection.password"?: string | string[];
    "passwordProtection.passwordIsPin"?: "true" | "!";
    "passwordProtection.passwordLocationIndicator"?: string | string[];
}

export interface GetRelationshipTemplatesRequest {
    query?: GetRelationshipTemplatesQuery;
    ownerRestriction?: OwnerRestriction;
}

class Validator extends SchemaValidator<GetRelationshipTemplatesRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetRelationshipTemplatesRequest"));
    }
}

export class GetRelationshipTemplatesUseCase extends UseCase<GetRelationshipTemplatesRequest, RelationshipTemplateDTO[]> {
    private static readonly queryTranslator = new QueryTranslator({
        whitelist: {
            [nameof<RelationshipTemplateDTO>((r) => r.isOwn)]: true,
            [nameof<RelationshipTemplateDTO>((r) => r.createdAt)]: true,
            [nameof<RelationshipTemplateDTO>((r) => r.expiresAt)]: true,
            [nameof<RelationshipTemplateDTO>((r) => r.createdBy)]: true,
            [nameof<RelationshipTemplateDTO>((r) => r.createdByDevice)]: true,
            [nameof<RelationshipTemplateDTO>((r) => r.maxNumberOfAllocations)]: true,
            [nameof<RelationshipTemplateDTO>((r) => r.forIdentity)]: true,
            [nameof<RelationshipTemplateDTO>((r) => r.passwordProtection)]: true,
            [`${nameof<RelationshipTemplateDTO>((r) => r.passwordProtection)}.password`]: true,
            [`${nameof<RelationshipTemplateDTO>((r) => r.passwordProtection)}.passwordIsPin`]: true,
            [`${nameof<RelationshipTemplateDTO>((r) => r.passwordProtection)}.passwordLocationIndicator`]: true
        },
        alias: {
            [nameof<RelationshipTemplateDTO>((r) => r.isOwn)]: nameof<RelationshipTemplate>((r) => r.isOwn),
            [nameof<RelationshipTemplateDTO>((r) => r.createdAt)]: `${nameof<RelationshipTemplate>((r) => r.cache)}.${nameof<CachedRelationshipTemplate>((t) => t.createdAt)}`,
            [nameof<RelationshipTemplateDTO>((r) => r.expiresAt)]: `${nameof<RelationshipTemplate>((r) => r.cache)}.${nameof<CachedRelationshipTemplate>((t) => t.expiresAt)}`,
            [nameof<RelationshipTemplateDTO>((r) => r.createdBy)]: `${nameof<RelationshipTemplate>((r) => r.cache)}.${nameof<CachedRelationshipTemplate>((t) => t.createdBy)}`,
            [nameof<RelationshipTemplateDTO>((r) => r.createdByDevice)]: `${nameof<RelationshipTemplate>((r) => r.cache)}.${nameof<CachedRelationshipTemplate>(
                (t) => t.createdByDevice
            )}`,
            [nameof<RelationshipTemplateDTO>((r) => r.maxNumberOfAllocations)]: `${nameof<RelationshipTemplate>((r) => r.cache)}.${nameof<CachedRelationshipTemplate>(
                (t) => t.maxNumberOfAllocations
            )}`,
            [nameof<RelationshipTemplateDTO>((r) => r.forIdentity)]: `${nameof<RelationshipTemplate>((r) => r.cache)}.${nameof<CachedRelationshipTemplate>((t) => t.forIdentity)}`,
            [nameof<RelationshipTemplateDTO>((r) => r.passwordProtection)]: nameof<RelationshipTemplate>((r) => r.passwordProtection)
        },
        custom: {
            [`${nameof<RelationshipTemplateDTO>((r) => r.passwordProtection)}.password`]: (query: any, input: string | string[]) => {
                query[`${nameof<RelationshipTemplate>((t) => t.passwordProtection)}.${nameof<PasswordProtection>((t) => t.password)}`] = input;
            },
            [`${nameof<RelationshipTemplateDTO>((t) => t.passwordProtection)}.passwordIsPin`]: (query: any, input: string) => {
                if (input === "true") {
                    query[`${nameof<RelationshipTemplate>((t) => t.passwordProtection)}.${nameof<PasswordProtection>((t) => t.passwordType)}`] = {
                        $regex: "^pin"
                    };
                }
                if (input === "!") {
                    query[`${nameof<RelationshipTemplate>((t) => t.passwordProtection)}.${nameof<PasswordProtection>((t) => t.passwordType)}`] = "pw";
                }
            },
            [`${nameof<RelationshipTemplateDTO>((r) => r.passwordProtection)}.passwordLocationIndicator`]: (query: any, input: string | string[]) => {
                const queryValue = PasswordProtectionMapper.mapPasswordLocationIndicatorFromQuery(input);
                query[`${nameof<RelationshipTemplate>((t) => t.passwordProtection)}.${nameof<PasswordProtection>((t) => t.passwordLocationIndicator)}`] = queryValue;
            }
        }
    });

    public constructor(
        @Inject private readonly relationshipTemplateController: RelationshipTemplateController,

        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetRelationshipTemplatesRequest): Promise<Result<RelationshipTemplateDTO[]>> {
        const query = GetRelationshipTemplatesUseCase.queryTranslator.parse(request.query);

        if (request.ownerRestriction) {
            query[nameof<RelationshipTemplate>((t) => t.isOwn)] = request.ownerRestriction === OwnerRestriction.Own;
        }

        const relationshipTemplates = await this.relationshipTemplateController.getRelationshipTemplates(query);
        return Result.ok(RelationshipTemplateMapper.toRelationshipTemplateDTOList(relationshipTemplates));
    }
}
