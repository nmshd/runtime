import { QueryTranslator } from "@js-soft/docdb-querytranslator";
import { Result } from "@js-soft/ts-utils";
import { AttributeForwardingDetailsJSON, AttributesController, EmittedAttributeDeletionInfoJSON, LocalAttribute } from "@nmshd/consumption";
import { CoreId } from "@nmshd/core-types";
import { LocalAttributeDeletionInfoDTO, LocalAttributeForwardingDetailsDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { nameof } from "ts-simple-nameof";
import { flattenObject, RuntimeErrors, SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "./AttributeMapper";

export interface GetForwardingDetailsForAttributeRequest {
    attributeId: string;
    query?: GetForwardingDetailsForAttributeRequestQuery;
}

export interface GetForwardingDetailsForAttributeRequestQuery {
    peer?: string | string[];
    sourceReference?: string | string[];
    sharedAt?: string | string[];
    deletionInfo?: string | string[];
    "deletionInfo.deletionStatus"?: string | string[];
    "deletionInfo.deletionDate"?: string | string[];
}

class Validator extends SchemaValidator<GetForwardingDetailsForAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetForwardingDetailsForAttributeRequest"));
    }
}

export class GetForwardingDetailsForAttributeUseCase extends UseCase<GetForwardingDetailsForAttributeRequest, LocalAttributeForwardingDetailsDTO[]> {
    public static readonly queryTranslator = new QueryTranslator({
        whitelist: {
            [`${nameof<LocalAttributeForwardingDetailsDTO>((x) => x.peer)}`]: true,
            [`${nameof<LocalAttributeForwardingDetailsDTO>((x) => x.sourceReference)}`]: true,
            [`${nameof<LocalAttributeForwardingDetailsDTO>((x) => x.sharedAt)}`]: true,
            [`${nameof<LocalAttributeForwardingDetailsDTO>((x) => x.deletionInfo)}`]: true,
            [`${nameof<LocalAttributeForwardingDetailsDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionStatus)}`]: true,
            [`${nameof<LocalAttributeForwardingDetailsDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionDate)}`]: true
        },
        alias: {
            [`${nameof<LocalAttributeForwardingDetailsDTO>((x) => x.peer)}`]: `${nameof<AttributeForwardingDetailsJSON>((x) => x.peer)}`,
            [`${nameof<LocalAttributeForwardingDetailsDTO>((x) => x.sourceReference)}`]: `${nameof<AttributeForwardingDetailsJSON>((x) => x.sourceReference)}`,
            [`${nameof<LocalAttributeForwardingDetailsDTO>((x) => x.sharedAt)}`]: `${nameof<AttributeForwardingDetailsJSON>((x) => x.sharedAt)}`,
            [`${nameof<LocalAttributeForwardingDetailsDTO>((x) => x.deletionInfo)}`]: `${nameof<AttributeForwardingDetailsJSON>((x) => x.deletionInfo)}`,
            [`${nameof<LocalAttributeForwardingDetailsDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionStatus)}`]: `${nameof<AttributeForwardingDetailsJSON>((x) => x.deletionInfo)}.${nameof<EmittedAttributeDeletionInfoJSON>((x) => x.deletionStatus)}`,
            [`${nameof<LocalAttributeForwardingDetailsDTO>((x) => x.deletionInfo)}.${nameof<LocalAttributeDeletionInfoDTO>((x) => x.deletionDate)}`]: `${nameof<AttributeForwardingDetailsJSON>((x) => x.deletionInfo)}.${nameof<EmittedAttributeDeletionInfoJSON>((x) => x.deletionDate)}`
        }
    });

    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetForwardingDetailsForAttributeRequest): Promise<Result<LocalAttributeForwardingDetailsDTO[]>> {
        const attribute = await this.attributeController.getLocalAttribute(CoreId.from(request.attributeId));
        if (!attribute) return Result.fail(RuntimeErrors.general.recordNotFound(LocalAttribute));

        const query = request.query ?? {};
        const flattenedQuery = flattenObject(query);
        const dbQuery = GetForwardingDetailsForAttributeUseCase.queryTranslator.parse(flattenedQuery);

        const forwardingDetails = await this.attributeController.getForwardingDetailsForAttribute(attribute, dbQuery);
        const dtos = forwardingDetails.map((forwardingDetails) => AttributeMapper.toForwardingDetailsDTO(forwardingDetails));

        return Result.ok(dtos);
    }
}
