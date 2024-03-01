import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { Inject } from "typescript-ioc";
import { AttributeMapper, GetAttributesRequestQuery, GetAttributesUseCase } from "..";
import { LocalAttributeDTO } from "../../../types";
import { flattenObject, SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface GetRepositoryAttributesRequest {
    /**
     * default: true
     */
    onlyLatestVersions?: boolean;
    query?: GetRepositoryAttributesRequestQuery;
}

export interface GetRepositoryAttributesRequestQuery {
    createdAt?: string;
    "content.tags"?: string | string[];
    "content.validFrom"?: string | string[];
    "content.validTo"?: string | string[];
    "content.value.@type"?: string | string[];
    deletionInfo?: string | string[];
    "deletionInfo.deletionStatus"?: string | string[];
    "deletionInfo.deletionDate"?: string | string[];
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

        if (typeof request.onlyLatestVersions === "undefined" || request.onlyLatestVersions) {
            dbQuery["succeededBy"] = { $exists: false };
        }

        const attributes = await this.attributesController.getLocalAttributes(dbQuery);

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
