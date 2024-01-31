import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
import { Inject } from "typescript-ioc";
import { AttributeMapper } from "..";
import { LocalAttributeDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface GetRepositoryAttributesRequest {
    onlyLatestVersions?: boolean;
}

export interface GetRepositoryAttributesResponse extends Array<LocalAttributeDTO> {}

class Validator extends SchemaValidator<GetRepositoryAttributesRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetRepositoryAttributesRequest"));
    }
}

export class GetRepositoryAttributesUseCase extends UseCase<GetRepositoryAttributesRequest, GetRepositoryAttributesResponse> {
    public constructor(
        @Inject private readonly attributesController: AttributesController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetRepositoryAttributesRequest): Promise<Result<GetRepositoryAttributesResponse>> {
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
