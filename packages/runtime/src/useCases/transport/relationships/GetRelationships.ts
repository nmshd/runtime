import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { Result } from "@js-soft/ts-utils";
import { CachedRelationship, Identity, Relationship, RelationshipsController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { nameof } from "ts-simple-nameof";
import { RelationshipDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { RelationshipMapper } from "./RelationshipMapper";

export interface GetRelationshipsQuery {
    peer?: string | string[];
    status?: string | string[];
    "template.id"?: string | string[];
}

export interface GetRelationshipsRequest {
    query?: GetRelationshipsQuery;
}

class Validator extends SchemaValidator<GetRelationshipsRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetRelationshipsRequest"));
    }
}

export class GetRelationshipsUseCase extends UseCase<GetRelationshipsRequest, RelationshipDTO[]> {
    private static readonly queryTranslator = new QueryTranslator({
        whitelist: {
            [nameof<RelationshipDTO>((r) => r.peer)]: true,
            [nameof<RelationshipDTO>((r) => r.status)]: true,
            [`${nameof<RelationshipDTO>((r) => r.templateId)}`]: true
        },
        alias: {
            [`${nameof<RelationshipDTO>((r) => r.templateId)}`]: `${nameof<Relationship>((r) => r.cache)}.${nameof<CachedRelationship>((r) => r.templateId)}`,
            [nameof<RelationshipDTO>((r) => r.status)]: nameof<Relationship>((r) => r.status),
            [nameof<RelationshipDTO>((r) => r.peer)]: `${nameof<Relationship>((r) => r.peer)}.${nameof<Identity>((r) => r.address)}`
        }
    });

    public constructor(
        @Inject private readonly relationshipsController: RelationshipsController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetRelationshipsRequest): Promise<Result<RelationshipDTO[]>> {
        const query = GetRelationshipsUseCase.queryTranslator.parse(request.query);

        const relationships = await this.relationshipsController.getRelationships(query);

        return Result.ok(RelationshipMapper.toRelationshipDTOList(relationships));
    }
}
