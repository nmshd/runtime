import { Result } from "@js-soft/ts-utils";
import { IdentityMetadataController } from "@nmshd/consumption";
import { CoreAddress } from "@nmshd/core-types";
import { IdentityMetadataDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { AddressString, RuntimeErrors, SchemaRepository, SchemaValidator } from "../../common/index.js";
import { UseCase } from "../../common/UseCase.js";
import { IdentityMetadataMapper } from "./IdentityMetadataMapper.js";

export interface GetIdentityMetadataRequest {
    reference: AddressString;
    key?: string;
}

class Validator extends SchemaValidator<GetIdentityMetadataRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetIdentityMetadataRequest"));
    }
}

export class GetIdentityMetadataUseCase extends UseCase<GetIdentityMetadataRequest, IdentityMetadataDTO> {
    public constructor(
        @Inject private readonly identityMetadataController: IdentityMetadataController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: GetIdentityMetadataRequest): Promise<Result<IdentityMetadataDTO>> {
        const identityMetadata = await this.identityMetadataController.getIdentityMetadata(CoreAddress.from(request.reference), request.key);
        if (!identityMetadata) {
            return Result.fail(RuntimeErrors.identityMetadata.notFound());
        }

        return Result.ok(IdentityMetadataMapper.toIdentityMetadataDTO(identityMetadata));
    }
}
