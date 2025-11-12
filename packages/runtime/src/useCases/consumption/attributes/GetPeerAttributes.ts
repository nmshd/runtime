import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { flattenObject } from "../../common/flattenObject.js";
import { AddressString, SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";
import { AttributeMapper } from "./AttributeMapper.js";
import { GetAttributesRequestQuery, GetAttributesUseCase } from "./GetAttributes.js";

export interface GetPeerAttributesRequest {
    peer: AddressString;
    query?: GetPeerAttributesRequestQuery;
    hideTechnical?: boolean;
    /**
     * default: true
     */
    onlyLatestVersions?: boolean;
}

export interface GetPeerAttributesRequestQuery {
    "@type"?: string | string[];
    createdAt?: string;
    wasViewedAt?: string | string[];
    "content.@type"?: string | string[];
    "content.tags"?: string | string[];
    "content.key"?: string | string[];
    "content.isTechnical"?: string;
    "content.confidentiality"?: string | string[];
    "content.value.@type"?: string | string[];
    sourceReference?: string | string[];
    initialAttributePeer?: string | string[];
    deletionInfo?: string | string[];
    "deletionInfo.deletionStatus"?: string | string[];
    "deletionInfo.deletionDate"?: string | string[];
}

class Validator extends SchemaValidator<GetPeerAttributesRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetPeerAttributesRequest"));
    }
}

export class GetPeerAttributesUseCase extends UseCase<GetPeerAttributesRequest, LocalAttributeDTO[]> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetPeerAttributesRequest): Promise<Result<LocalAttributeDTO[]>> {
        const query: GetAttributesRequestQuery = request.query ?? {};

        const flattenedQuery = flattenObject(query);
        const dbQuery = GetAttributesUseCase.queryTranslator.parse(flattenedQuery);

        dbQuery["@type"] = { $in: ["PeerIdentityAttribute", "PeerRelationshipAttribute", "ThirdPartyRelationshipAttribute"] };
        dbQuery["peer"] = request.peer;

        if (request.onlyLatestVersions ?? true) dbQuery["succeededBy"] = { $exists: false };

        const attributes = await this.attributeController.getLocalAttributes(dbQuery, request.hideTechnical);

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
