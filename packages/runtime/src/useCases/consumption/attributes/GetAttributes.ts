import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { Result } from "@js-soft/ts-utils";
import {
    AbstractAttributeDeletionInfoJSON,
    AttributesController,
    ForwardedSharingDetailsJSON,
    PeerSharingDetailsJSON,
    ThirdPartyRelationshipAttributeSharingDetailsJSON
} from "@nmshd/consumption";
import { AttributeWithPeerSharingDetails } from "@nmshd/consumption/src/modules/attributes/local/attributeTypes/AttributeWithPeerSharingDetails";
import { ForwardableAttribute } from "@nmshd/consumption/src/modules/attributes/local/attributeTypes/ForwardableAttribute";
import { LocalAttribute } from "@nmshd/consumption/src/modules/attributes/local/attributeTypes/LocalAttribute";
import { OwnIdentityAttribute } from "@nmshd/consumption/src/modules/attributes/local/attributeTypes/OwnIdentityAttribute";
import { ThirdPartyRelationshipAttribute } from "@nmshd/consumption/src/modules/attributes/local/attributeTypes/ThirdPartyRelationshipAttribute";
import { AbstractAttributeJSON, IdentityAttribute, IdentityAttributeJSON, RelationshipAttributeJSON } from "@nmshd/content";
import { ForwardedSharingDetailsDTO, LocalAttributeDeletionInfoDTO, LocalAttributeDTO, PeerSharingDetailsDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { nameof } from "ts-simple-nameof";
import { UseCase } from "../../common";
import { flattenObject } from "../../common/flattenObject";
import { AttributeMapper } from "./AttributeMapper";

export interface GetAttributesRequest {
    query?: GetAttributesRequestQuery;
    hideTechnical?: boolean;
}

export interface GetAttributesRequestQuery {
    "@type"?: string | string[];
    createdAt?: string;
    succeeds?: string | string[];
    succeededBy?: string | string[];
    wasViewedAt?: string | string[];
    isDefault?: string;
    "content.@type"?: string | string[];
    "content.tags"?: string | string[];
    "content.owner"?: string | string[];
    "content.key"?: string | string[];
    "content.isTechnical"?: string;
    "content.confidentiality"?: string | string[];
    "content.value.@type"?: string | string[];
    peerSharingDetails?: string | string[];
    "peerSharingDetails.peer"?: string | string[];
    "peerSharingDetails.sourceReference"?: string | string[];
    "peerSharingDetails.initialAttributePeer"?: string | string[];
    "peerSharingDetails.deletionInfo"?: string | string[];
    "peerSharingDetails.deletionInfo.deletionStatus"?: string | string[];
    "peerSharingDetails.deletionInfo.deletionDate"?: string | string[];
    forwardedSharingDetails?: string | string[];
    "forwardedSharingDetails.peer"?: string | string[];
    "forwardedSharingDetails.sourceReference"?: string | string[];
    "forwardedSharingDetails.sharedAt"?: string | string[];
    "forwardedSharingDetails.deletionInfo"?: string | string[];
    "forwardedSharingDetails.deletionInfo.deletionStatus"?: string | string[];
    "forwardedSharingDetails.deletionInfo.deletionDate"?: string | string[];
}

export class GetAttributesUseCase extends UseCase<GetAttributesRequest, LocalAttributeDTO[]> {
    public static readonly queryTranslator = new QueryTranslator({
        whitelist: {
            ["@type"]: true,
            [nameof<LocalAttributeDTO>((x) => x.createdAt)]: true,
            [nameof<LocalAttributeDTO>((x) => x.succeeds)]: true,
            [nameof<LocalAttributeDTO>((x) => x.succeededBy)]: true,
            [nameof<LocalAttributeDTO>((x) => x.wasViewedAt)]: true,
            [nameof<LocalAttributeDTO>((x) => x.isDefault)]: true,

            // content.abstractAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.owner)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.@type`]: true,

            // content.identityAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`]: true,
            [`${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.value)}.@type`]: true,

            // content.relationshipAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.key)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.isTechnical)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.confidentiality)}`]: true,

            // peerSharingDetails
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsDTO>((x) => x.peer)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsDTO>((x) => x.sourceReference)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsDTO>((x) => x.initialAttributePeer)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsDTO>((x) => x.deletionInfo)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionStatus)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionDate)}`]: true,

            // forwardedSharingDetails
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsDTO>((x) => x.peer)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsDTO>((x) => x.sourceReference)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsDTO>((x) => x.sharedAt)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsDTO>((x) => x.deletionInfo)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionStatus)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionDate)}`]: true
        },
        alias: {
            [nameof<LocalAttributeDTO>((x) => x.createdAt)]: nameof<LocalAttribute>((x) => x.createdAt),
            [nameof<LocalAttributeDTO>((x) => x.succeeds)]: nameof<LocalAttribute>((x) => x.succeeds),
            [nameof<LocalAttributeDTO>((x) => x.succeededBy)]: nameof<LocalAttribute>((x) => x.succeededBy),
            [nameof<LocalAttributeDTO>((x) => x.wasViewedAt)]: nameof<LocalAttribute>((x) => x.wasViewedAt),
            [nameof<LocalAttributeDTO>((x) => x.isDefault)]: nameof<OwnIdentityAttribute>((x) => x.isDefault),

            // content.abstractAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.owner)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.owner)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.@type`]: `${nameof<LocalAttribute>((x) => x.content)}.@type`,

            // content.identityAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`,
            [`${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.value)}.@type`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.value)}.@type`,

            // content.relationshipAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.key)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.key)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.isTechnical)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.isTechnical)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.confidentiality)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.confidentiality)}`,

            // peerSharingDetails
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}`]: `${nameof<AttributeWithPeerSharingDetails>((x) => x.peerSharingDetails)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsDTO>((x) => x.peer)}`]: `${nameof<AttributeWithPeerSharingDetails>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsJSON>((x) => x.peer)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsDTO>((x) => x.sourceReference)}`]: `${nameof<AttributeWithPeerSharingDetails>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsJSON>((x) => x.sourceReference)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsDTO>((x) => x.initialAttributePeer)}`]: `${nameof<ThirdPartyRelationshipAttribute>((x) => x.peerSharingDetails)}.${nameof<ThirdPartyRelationshipAttributeSharingDetailsJSON>((x) => x.initialAttributePeer)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsDTO>((x) => x.deletionInfo)}`]: `${nameof<AttributeWithPeerSharingDetails>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsJSON>((x) => x.deletionInfo)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionStatus)}`]: `${nameof<AttributeWithPeerSharingDetails>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsJSON>((x) => x.deletionInfo)}.${nameof<AbstractAttributeDeletionInfoJSON>((x) => x.deletionStatus)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionDate)}`]: `${nameof<AttributeWithPeerSharingDetails>((x) => x.peerSharingDetails)}.${nameof<PeerSharingDetailsJSON>((x) => x.deletionInfo)}.${nameof<AbstractAttributeDeletionInfoJSON>((x) => x.deletionDate)}`,

            // forwardedSharingDetails
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}`]: `${nameof<ForwardableAttribute>((x) => x.forwardedSharingDetails)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsDTO>((x) => x.peer)}`]: `${nameof<ForwardableAttribute>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsJSON>((x) => x.peer)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsDTO>((x) => x.sourceReference)}`]: `${nameof<ForwardableAttribute>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsJSON>((x) => x.sourceReference)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsDTO>((x) => x.sharedAt)}`]: `${nameof<ForwardableAttribute>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsJSON>((x) => x.sharedAt)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsDTO>((x) => x.deletionInfo)}`]: `${nameof<ForwardableAttribute>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsJSON>((x) => x.deletionInfo)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionStatus)}`]: `${nameof<ForwardableAttribute>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsJSON>((x) => x.deletionInfo)}.${nameof<AbstractAttributeDeletionInfoJSON>((x) => x.deletionStatus)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionDate)}`]: `${nameof<ForwardableAttribute>((x) => x.forwardedSharingDetails)}.${nameof<ForwardedSharingDetailsJSON>((x) => x.deletionInfo)}.${nameof<AbstractAttributeDeletionInfoJSON>((x) => x.deletionDate)}`
        },
        custom: {
            // content.tags
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<IdentityAttribute>((x) => x.tags)}`]: (query: any, input: string | string[]) => {
                if (typeof input === "string") {
                    query[`${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`] = { $contains: input };
                    return;
                }
                const allowedTags = [];
                for (const tag of input) {
                    const tagQuery = { [`${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`]: { $contains: tag } };
                    allowedTags.push(tagQuery);
                }
                query["$or"] = allowedTags;
            }
        }
    });

    public constructor(@Inject private readonly attributeController: AttributesController) {
        super();
    }

    protected async executeInternal(request: GetAttributesRequest): Promise<Result<LocalAttributeDTO[]>> {
        const query = request.query ?? {};
        const flattenedQuery = flattenObject(query);
        const dbQuery = GetAttributesUseCase.queryTranslator.parse(flattenedQuery);

        const attributes = await this.attributeController.getLocalAttributes(dbQuery, request.hideTechnical);

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
