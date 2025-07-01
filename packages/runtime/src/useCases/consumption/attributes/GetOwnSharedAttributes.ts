import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { IdentityController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { AddressString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { flattenObject } from "../../common/flattenObject";
import { AttributeMapper } from "./AttributeMapper";
import { GetAttributesRequestQuery, GetAttributesUseCase } from "./GetAttributes";

export interface GetOwnSharedAttributesRequest {
    peer: AddressString;
    onlyValid?: boolean;
    query?: GetOwnSharedAttributeRequestQuery;
    hideTechnical?: boolean;
    /**
     * default: true
     */
    onlyLatestVersions?: boolean;
}

export interface GetOwnSharedAttributeRequestQuery {
    createdAt?: string;
    wasViewedAt?: string | string[];
    "content.@type"?: string | string[];
    "content.tags"?: string | string[];
    "content.validFrom"?: string | string[];
    "content.validTo"?: string | string[];
    "content.key"?: string | string[];
    "content.isTechnical"?: string;
    "content.confidentiality"?: string | string[];
    "content.value.@type"?: string | string[];
    shareInfo?: string | string[];
    "shareInfo.requestReference"?: string | string[];
    "shareInfo.notificationReference"?: string | string[];
    "shareInfo.sourceAttribute"?: string | string[];
    "shareInfo.thirdPartyAddress"?: string | string[];
    deletionInfo?: string | string[];
    "deletionInfo.deletionStatus"?: string | string[];
    "deletionInfo.deletionDate"?: string | string[];
}

class Validator extends SchemaValidator<GetOwnSharedAttributesRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetOwnSharedAttributesRequest"));
    }
}

export class GetOwnSharedAttributesUseCase extends UseCase<GetOwnSharedAttributesRequest, LocalAttributeDTO[]> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly identityController: IdentityController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetOwnSharedAttributesRequest): Promise<Result<LocalAttributeDTO[]>> {
        const query: GetAttributesRequestQuery = request.query ?? {};
        query["content.owner"] = this.identityController.address.toString();

        query["shareInfo.peer"] = request.peer;

        const flattenedQuery = flattenObject(query);
        const dbQuery = GetAttributesUseCase.queryTranslator.parse(flattenedQuery);

        if (request.onlyLatestVersions ?? true) {
            dbQuery["succeededBy"] = { $exists: false };
        }

        const attributes = await this.attributeController.getLocalAttributes(dbQuery, request.hideTechnical, request.onlyValid);

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
