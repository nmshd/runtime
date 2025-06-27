import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, UseCase, flattenObject } from "../../common";
import { AttributeMapper } from "./AttributeMapper";
import { GetAttributesRequestQuery, GetAttributesUseCase } from "./GetAttributes";

export interface GetRepositoryAttributesRequest {
    /**
     * default: true
     */
    onlyLatestVersions?: boolean;
    query?: GetRepositoryAttributesRequestQuery;
}

export interface GetRepositoryAttributesRequestQuery {
    createdAt?: string;
    isDefault?: string;
    wasViewedAt?: string | string[];
    "content.tags"?: string | string[];
    "content.value.@type"?: string | string[];
}

export interface GetRepositoryAttributesResponse extends Array<LocalAttributeDTO> {}

class Validator extends SchemaValidator<GetRepositoryAttributesRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetRepositoryAttributesRequest"));
    }
}

export class GetRepositoryAttributesUseCase extends UseCase<GetRepositoryAttributesRequest, GetRepositoryAttributesResponse> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetRepositoryAttributesRequest): Promise<Result<GetRepositoryAttributesResponse>> {
        const query: GetAttributesRequestQuery = request.query ?? {};
        const flattenedQuery = flattenObject(query);
        const dbQuery = GetAttributesUseCase.queryTranslator.parse(flattenedQuery);
        dbQuery.shareInfo = { $exists: false };

        if (request.onlyLatestVersions ?? true) dbQuery["succeededBy"] = { $exists: false };

        const attributes = await this.attributesController.getLocalAttributes(dbQuery);

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
