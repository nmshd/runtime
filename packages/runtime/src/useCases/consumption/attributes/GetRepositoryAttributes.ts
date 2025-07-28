import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
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
    forwardedSharingInfos?: string | string[];
    "forwardedSharingInfos.peer"?: string | string[];
    "forwardedSharingInfos.sourceReference"?: string | string[];
    "forwardedSharingInfos.sharedAt"?: string | string[];
    "forwardedSharingInfos.deletionInfo"?: string | string[];
    "forwardedSharingInfos.deletionInfo.deletionStatus"?: string | string[];
    "forwardedSharingInfos.deletionInfo.deletionDate"?: string | string[];
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

        query["@type"] = "OwnIdentityAttribute";

        const flattenedQuery = flattenObject(query);
        const dbQuery = GetAttributesUseCase.queryTranslator.parse(flattenedQuery);

        if (request.onlyLatestVersions ?? true) dbQuery["succeededBy"] = { $exists: false };

        const attributes = await this.attributesController.getLocalAttributes(dbQuery);

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
