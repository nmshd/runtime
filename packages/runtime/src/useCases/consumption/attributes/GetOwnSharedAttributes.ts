import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { IdentityController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AddressString, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { flattenObject } from "../../common/flattenObject";
import { AttributeMapper } from "./AttributeMapper";
import { GetAttributesRequestQuery, GetAttributesUseCase } from "./GetAttributes";

export interface GetOwnSharedAttributesRequest {
    peer: AddressString;
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
    isDefault?: string;
    "content.@type"?: string | string[];
    "content.tags"?: string | string[];
    "content.key"?: string | string[];
    "content.isTechnical"?: string;
    "content.confidentiality"?: string | string[];
    "content.value.@type"?: string | string[];
    peerSharingInfo?: string | string[];
    "peerSharingInfo.peer"?: string | string[];
    "peerSharingInfo.sourceReference"?: string | string[];
    "peerSharingInfo.deletionInfo"?: string | string[];
    "peerSharingInfo.deletionInfo.deletionStatus"?: string | string[];
    "peerSharingInfo.deletionInfo.deletionDate"?: string | string[];
    forwardedSharingInfos?: string | string[];
    "forwardedSharingInfos.peer"?: string | string[];
    "forwardedSharingInfos.sourceReference"?: string | string[];
    "forwardedSharingInfos.sharedAt"?: string | string[];
    "forwardedSharingInfos.deletionInfo"?: string | string[];
    "forwardedSharingInfos.deletionInfo.deletionStatus"?: string | string[];
    "forwardedSharingInfos.deletionInfo.deletionDate"?: string | string[];
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

        const flattenedQuery = flattenObject(query);
        const dbQuery = GetAttributesUseCase.queryTranslator.parse(flattenedQuery);

        dbQuery["@type"] = { $in: ["OwnIdentityAttribute", "OwnRelationshipAttribute"] };

        if (request.onlyLatestVersions ?? true) {
            dbQuery["succeededBy"] = { $exists: false };
        }

        const attributes = await this.attributeController.getLocalAttributes(dbQuery, request.hideTechnical);

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
