import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase, flattenObject } from "../../common/index.js";
import { AttributeMapper } from "./AttributeMapper.js";
import { GetAttributesRequestQuery, GetAttributesUseCase } from "./GetAttributes.js";

export interface GetOwnIdentityAttributesRequest {
    /**
     * default: true
     */
    onlyLatestVersions?: boolean;
    query?: GetOwnIdentityAttributesRequestQuery;
}

export interface GetOwnIdentityAttributesRequestQuery {
    createdAt?: string;
    wasViewedAt?: string | string[];
    isDefault?: string;
    "content.tags"?: string | string[];
    "content.value.@type"?: string | string[];
}

export interface GetOwnIdentityAttributesResponse extends Array<LocalAttributeDTO> {}

class Validator extends SchemaValidator<GetOwnIdentityAttributesRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetOwnIdentityAttributesRequest"));
    }
}

export class GetOwnIdentityAttributesUseCase extends UseCase<GetOwnIdentityAttributesRequest, GetOwnIdentityAttributesResponse> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetOwnIdentityAttributesRequest): Promise<Result<GetOwnIdentityAttributesResponse>> {
        const query: GetAttributesRequestQuery = request.query ?? {};

        const flattenedQuery = flattenObject(query);
        const dbQuery = GetAttributesUseCase.queryTranslator.parse(flattenedQuery);

        dbQuery["@type"] = "OwnIdentityAttribute";

        if (request.onlyLatestVersions ?? true) dbQuery["succeededBy"] = { $exists: false };

        const attributes = await this.attributesController.getLocalAttributes(dbQuery);

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
