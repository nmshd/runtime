import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { Inject } from "typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "../../consumption";

export interface GetOwnIdentityAttributesRequest {
    onlyLatestVersions?: boolean;
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
        const query: any = {
            shareInfo: { $exists: false }
        };

        if (typeof request.onlyLatestVersions === "undefined" || request.onlyLatestVersions) {
            query["succeededBy"] = { $exists: false };
        }

        const attributes = await this.attributesController.getLocalAttributes(query);

        return Result.ok(AttributeMapper.toAttributeDTOList(attributes));
    }
}
