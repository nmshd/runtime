import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { Result } from "@js-soft/ts-utils";
import { AttributesController, LocalAttribute, LocalAttributeDeletionInfoJSON, LocalAttributeShareInfoJSON } from "@nmshd/consumption";
import { AbstractAttributeJSON, IdentityAttribute, IdentityAttributeJSON, RelationshipAttributeJSON } from "@nmshd/content";
import { DateTime } from "luxon";
import { nameof } from "ts-simple-nameof";
import { Inject } from "typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { UseCase } from "../../common";
import { flattenObject } from "../../common/flattenObject";
import { AttributeMapper } from "./AttributeMapper";

export interface GetAttributesRequest {
    query?: GetAttributesRequestQuery;
    onlyValid?: boolean;
    hideTechnical?: boolean;
}

export interface GetAttributesRequestQuery {
    createdAt?: string;
    parentId?: string | string[];
    succeeds?: string | string[];
    succeededBy?: string | string[];
    isDefault?: string;
    "content.@type"?: string | string[];
    "content.tags"?: string | string[];
    "content.owner"?: string | string[];
    "content.validFrom"?: string | string[];
    "content.validTo"?: string | string[];
    "content.key"?: string | string[];
    "content.isTechnical"?: string;
    "content.confidentiality"?: string | string[];
    "content.value.@type"?: string | string[];
    shareInfo?: string | string[];
    "shareInfo.requestReference"?: string | string[];
    "shareInfo.notificationReference"?: string | string[];
    "shareInfo.peer"?: string | string[];
    "shareInfo.sourceAttribute"?: string | string[];
    deletionInfo?: string | string[];
    "deletionInfo.deletionStatus"?: string | string[];
    "deletionInfo.deletionDate"?: string | string[];
}

export class GetAttributesUseCase extends UseCase<GetAttributesRequest, LocalAttributeDTO[]> {
    public static readonly queryTranslator = new QueryTranslator({
        whitelist: {
            [nameof<LocalAttributeDTO>((x) => x.createdAt)]: true,
            [nameof<LocalAttributeDTO>((x) => x.parentId)]: true,
            [nameof<LocalAttributeDTO>((x) => x.succeeds)]: true,
            [nameof<LocalAttributeDTO>((x) => x.succeededBy)]: true,
            [nameof<LocalAttributeDTO>((x) => x.isDefault)]: true,

            // content.abstractAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validFrom)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validTo)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.owner)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.@type`]: true,

            // content.identityAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`]: true,
            [`${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.value)}.@type`]: true,

            // content.relationshipAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.key)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.isTechnical)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.confidentiality)}`]: true,

            // shareInfo
            [`${nameof<LocalAttributeDTO>((x) => x.shareInfo)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.shareInfo)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.peer)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.shareInfo)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.requestReference)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.shareInfo)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.notificationReference)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.shareInfo)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.sourceAttribute)}`]: true,

            // deletionInfo
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoJSON>((x) => x.deletionStatus)}`]: true,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoJSON>((x) => x.deletionDate)}`]: true
        },
        alias: {
            [nameof<LocalAttributeDTO>((x) => x.createdAt)]: nameof<LocalAttribute>((x) => x.createdAt),
            [nameof<LocalAttributeDTO>((x) => x.parentId)]: nameof<LocalAttribute>((x) => x.parentId),
            [nameof<LocalAttributeDTO>((x) => x.succeeds)]: nameof<LocalAttribute>((x) => x.succeeds),
            [nameof<LocalAttributeDTO>((x) => x.succeededBy)]: nameof<LocalAttribute>((x) => x.succeededBy),
            [nameof<LocalAttributeDTO>((x) => x.isDefault)]: nameof<LocalAttribute>((x) => x.isDefault),

            // content.abstractAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validFrom)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validFrom)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validTo)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validTo)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.owner)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.owner)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.@type`]: `${nameof<LocalAttribute>((x) => x.content)}.@type`,

            // content.identityAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.tags)}`,
            [`${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.value)}.@type`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<IdentityAttributeJSON>((x) => x.value)}.@type`,

            // content.relationshipAttribute
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.key)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.key)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.isTechnical)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.isTechnical)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.confidentiality)}`]: `${nameof<LocalAttribute>((x) => x.content)}.${nameof<RelationshipAttributeJSON>((x) => x.confidentiality)}`,

            // shareInfo
            [`${nameof<LocalAttributeDTO>((x) => x.shareInfo)}`]: `${nameof<LocalAttribute>((x) => x.shareInfo)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.shareInfo)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.peer)}`]: `${nameof<LocalAttribute>((x) => x.shareInfo)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.peer)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.shareInfo)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.requestReference)}`]: `${nameof<LocalAttribute>((x) => x.shareInfo)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.requestReference)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.shareInfo)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.notificationReference)}`]: `${nameof<LocalAttribute>((x) => x.shareInfo)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.notificationReference)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.shareInfo)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.sourceAttribute)}`]: `${nameof<LocalAttribute>((x) => x.shareInfo)}.${nameof<LocalAttributeShareInfoJSON>((x) => x.sourceAttribute)}`,

            // deletionInfo
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}`]: `${nameof<LocalAttribute>((x) => x.deletionInfo)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoJSON>((x) => x.deletionStatus)}`]: `${nameof<LocalAttribute>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoJSON>((x) => x.deletionStatus)}`,
            [`${nameof<LocalAttributeDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoJSON>((x) => x.deletionDate)}`]: `${nameof<LocalAttribute>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoJSON>((x) => x.deletionDate)}`
        },
        custom: {
            // content.validFrom
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validFrom)}`]: (query: any, input: any) => {
                if (!input) {
                    return;
                }
                const validFromUtcString = DateTime.fromISO(input).toUTC().toString();
                query[`${nameof<LocalAttribute>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validFrom)}`] = {
                    $gte: validFromUtcString
                };
            },
            // content.validTo
            [`${nameof<LocalAttributeDTO>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validTo)}`]: (query: any, input: any) => {
                if (!input) {
                    return;
                }
                const validToUtcString = DateTime.fromISO(input).toUTC().toString();
                query[`${nameof<LocalAttribute>((x) => x.content)}.${nameof<AbstractAttributeJSON>((x) => x.validTo)}`] = {
                    $lte: validToUtcString
                };
            },
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

        const attributes = await this.attributeController.getLocalAttributes(dbQuery, request.hideTechnical, request.onlyValid);

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
