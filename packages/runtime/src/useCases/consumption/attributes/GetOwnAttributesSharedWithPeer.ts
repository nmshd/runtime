import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { CoreAddress } from "@nmshd/core-types";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { flattenObject } from "../../common/flattenObject.js";
import { AddressString, SchemaRepository, SchemaValidator, UseCase } from "../../common/index.js";
import { AttributeMapper } from "./AttributeMapper.js";
import { GetAttributesRequestQuery, GetAttributesUseCase } from "./GetAttributes.js";
import { GetForwardingDetailsForAttributeUseCase } from "./GetForwardingDetailsForAttribute.js";

export interface GetOwnAttributesSharedWithPeerRequest {
    peer: AddressString;
    query?: GetOwnAttributesSharedWithPeerRequestQuery;
    attributeForwardingDetailsQuery?: GetOwnAttributesSharedWithPeerRequestAttributeForwardingDetailsQuery;
    hideTechnical?: boolean;
    /**
     * default: true
     */
    onlyLatestVersions?: boolean;
}

export interface GetOwnAttributesSharedWithPeerRequestQuery {
    "@type"?: string | string[];
    createdAt?: string;
    wasViewedAt?: string | string[];
    isDefault?: string;
    "content.@type"?: string | string[];
    "content.tags"?: string | string[];
    "content.key"?: string | string[];
    "content.isTechnical"?: string;
    "content.confidentiality"?: string | string[];
    "content.value.@type"?: string | string[];
    sourceReference?: string | string[];
    deletionInfo?: string | string[];
    "deletionInfo.deletionStatus"?: string | string[];
    "deletionInfo.deletionDate"?: string | string[];
}

export interface GetOwnAttributesSharedWithPeerRequestAttributeForwardingDetailsQuery {
    sourceReference?: string | string[];
    sharedAt?: string | string[];
    deletionInfo?: string | string[];
    "deletionInfo.deletionStatus"?: string | string[];
    "deletionInfo.deletionDate"?: string | string[];
}

class Validator extends SchemaValidator<GetOwnAttributesSharedWithPeerRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetOwnAttributesSharedWithPeerRequest"));
    }
}

export class GetOwnAttributesSharedWithPeerUseCase extends UseCase<GetOwnAttributesSharedWithPeerRequest, LocalAttributeDTO[]> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetOwnAttributesSharedWithPeerRequest): Promise<Result<LocalAttributeDTO[]>> {
        const query: GetAttributesRequestQuery = request.query ?? {};
        const flattenedQuery = flattenObject(query);
        const dbQuery = GetAttributesUseCase.queryTranslator.parse(flattenedQuery);
        dbQuery["@type"] = dbQuery["@type"] ?? { $in: ["OwnIdentityAttribute", "OwnRelationshipAttribute"] };

        const attributeForwardingDetailsQuery = request.attributeForwardingDetailsQuery ?? {};
        const flattenedAttributeForwardingDetailsQuery = flattenObject(attributeForwardingDetailsQuery);
        const dbAttributeForwardingDetailsQuery = GetForwardingDetailsForAttributeUseCase.queryTranslator.parse(flattenedAttributeForwardingDetailsQuery);

        const attributes = await this.attributeController.getAttributesExchangedWithPeer(
            CoreAddress.from(request.peer),
            dbQuery,
            dbAttributeForwardingDetailsQuery,
            request.hideTechnical,
            request.onlyLatestVersions
        );

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
