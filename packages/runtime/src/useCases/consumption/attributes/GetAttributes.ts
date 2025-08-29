import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { Result } from "@js-soft/ts-utils";
import {
    AbstractAttributeDeletionInfoJSON,
    AttributesController,
    AttributeWithForwardedSharingInfos,
    AttributeWithPeerSharingInfo,
    ForwardedSharingInfoJSON,
    LocalAttribute,
    OwnIdentityAttribute,
    PeerSharingInfoJSON,
    ThirdPartyRelationshipAttribute,
    ThirdPartyRelationshipAttributeSharingInfoJSON
} from "@nmshd/consumption";
import { AbstractAttributeJSON, IdentityAttribute, IdentityAttributeJSON, RelationshipAttributeJSON } from "@nmshd/content";
import { ForwardedSharingInfoDTO, LocalAttributeDeletionInfoDTO, LocalAttributeDTO, PeerSharingInfoDTO } from "@nmshd/runtime-types";
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
    peerSharingInfo?: string | string[];
    "peerSharingInfo.peer"?: string | string[];
    "peerSharingInfo.sourceReference"?: string | string[];
    "peerSharingInfo.initialAttributePeer"?: string | string[];
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

            // peerSharingInfo
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoDTO>((x) => x.peer)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoDTO>((x) => x.sourceReference)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoDTO>((x) => x.initialAttributePeer)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoDTO>((x) => x.deletionInfo)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionStatus)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionDate)}`]: true,

            // forwardedSharingInfos
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoDTO>((x) => x.peer)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoDTO>((x) => x.sourceReference)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoDTO>((x) => x.sharedAt)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoDTO>((x) => x.deletionInfo)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionStatus)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionDate)}`]: true
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

            // peerSharingInfo
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}`]: `${nameof<AttributeWithPeerSharingInfo>((x) => x.peerSharingInfo)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoDTO>((x) => x.peer)}`]: `${nameof<AttributeWithPeerSharingInfo>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoJSON>((x) => x.peer)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoDTO>((x) => x.sourceReference)}`]: `${nameof<AttributeWithPeerSharingInfo>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoJSON>((x) => x.sourceReference)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoDTO>((x) => x.initialAttributePeer)}`]: `${nameof<ThirdPartyRelationshipAttribute>((x) => x.peerSharingInfo)}.${nameof<ThirdPartyRelationshipAttributeSharingInfoJSON>((x) => x.initialAttributePeer)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoDTO>((x) => x.deletionInfo)}`]: `${nameof<AttributeWithPeerSharingInfo>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoJSON>((x) => x.deletionInfo)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionStatus)}`]: `${nameof<AttributeWithPeerSharingInfo>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoJSON>((x) => x.deletionInfo)}.${nameof<AbstractAttributeDeletionInfoJSON>((x) => x.deletionStatus)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionDate)}`]: `${nameof<AttributeWithPeerSharingInfo>((x) => x.peerSharingInfo)}.${nameof<PeerSharingInfoJSON>((x) => x.deletionInfo)}.${nameof<AbstractAttributeDeletionInfoJSON>((x) => x.deletionDate)}`,

            // forwardedSharingInfos
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}`]: `${nameof<AttributeWithForwardedSharingInfos>((x) => x.forwardedSharingInfos)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoDTO>((x) => x.peer)}`]: `${nameof<AttributeWithForwardedSharingInfos>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoJSON>((x) => x.peer)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoDTO>((x) => x.sourceReference)}`]: `${nameof<AttributeWithForwardedSharingInfos>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoJSON>((x) => x.sourceReference)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoDTO>((x) => x.sharedAt)}`]: `${nameof<AttributeWithForwardedSharingInfos>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoJSON>((x) => x.sharedAt)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoDTO>((x) => x.deletionInfo)}`]: `${nameof<AttributeWithForwardedSharingInfos>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoJSON>((x) => x.deletionInfo)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionStatus)}`]: `${nameof<AttributeWithForwardedSharingInfos>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoJSON>((x) => x.deletionInfo)}.${nameof<AbstractAttributeDeletionInfoJSON>((x) => x.deletionStatus)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionDate)}`]: `${nameof<AttributeWithForwardedSharingInfos>((x) => x.forwardedSharingInfos)}.${nameof<ForwardedSharingInfoJSON>((x) => x.deletionInfo)}.${nameof<AbstractAttributeDeletionInfoJSON>((x) => x.deletionDate)}`
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
