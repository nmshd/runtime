import { JSONWrapper } from "@js-soft/ts-serval";
import { Result } from "@js-soft/ts-utils";
import { IdentityMetadataController } from "@nmshd/consumption";
import { CoreAddress } from "@nmshd/core-types";
import { AccountController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { IdentityMetadataDTO } from "../../../types";
import { AddressString, SchemaRepository, SchemaValidator } from "../../common";
import { UseCase } from "../../common/UseCase";
import { IdentityMetadataMapper } from "./IdentityMetadataMapper";

export interface UpsertIdentityMetadataRequest {
    reference: AddressString;
    key?: string;
    value: unknown;
}

class Validator extends SchemaValidator<UpsertIdentityMetadataRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("UpsertIdentityMetadataRequest"));
    }
}

export class UpsertIdentityMetadataUseCase extends UseCase<UpsertIdentityMetadataRequest, IdentityMetadataDTO> {
    public constructor(
        @Inject private readonly identityMetadataController: IdentityMetadataController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: UpsertIdentityMetadataRequest): Promise<Result<IdentityMetadataDTO>> {
        const value = JSONWrapper.fromAny(request.value);
        const identityMetadata = await this.identityMetadataController.upsertIdentityMetadata({ reference: CoreAddress.from(request.reference), key: request.key, value });

        await this.accountController.syncDatawallet();

        return Result.ok(IdentityMetadataMapper.toIdentityMetadataDTO(identityMetadata));
    }
}
