import { Result } from "@js-soft/ts-utils";
import { IdentityMetadataController } from "@nmshd/consumption";
import { CoreAddress } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { AddressString, RuntimeErrors, SchemaRepository, SchemaValidator } from "../../common/index.js";
import { UseCase } from "../../common/UseCase.js";

export interface DeleteIdentityMetadataRequest {
    reference: AddressString;
    key?: string;
}

class Validator extends SchemaValidator<DeleteIdentityMetadataRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("DeleteIdentityMetadataRequest"));
    }
}

export class DeleteIdentityMetadataUseCase extends UseCase<DeleteIdentityMetadataRequest, void> {
    public constructor(
        @Inject private readonly identityMetadataController: IdentityMetadataController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: DeleteIdentityMetadataRequest): Promise<Result<void>> {
        const identityMetadata = await this.identityMetadataController.getIdentityMetadata(CoreAddress.from(request.reference), request.key);
        if (!identityMetadata) {
            return Result.fail(RuntimeErrors.identityMetadata.notFound());
        }

        await this.identityMetadataController.deleteIdentityMetadata(identityMetadata);

        await this.accountController.syncDatawallet();

        return Result.ok(undefined);
    }
}
