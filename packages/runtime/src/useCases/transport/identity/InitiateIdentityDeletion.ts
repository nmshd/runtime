import { Result } from "@js-soft/ts-utils";
import { AccountController, IdentityController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { IdentityDeletionProcessDTO } from "../../../types/transport/IdentityDeletionProcessDTO";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { IdentityDeletionMapper } from "./IdentityDeletionMapper";

export interface InitiateIdentityDeletionRequest {}

export interface InitiateIdentityDeletionResponse {
    identityDeletionProcess: IdentityDeletionProcessDTO;
}

class Validator extends SchemaValidator<InitiateIdentityDeletionRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("InitiateIdentityDeletionRequest"));
    }
}

export class InitiateIdentityDeletionUseCase extends UseCase<InitiateIdentityDeletionRequest, InitiateIdentityDeletionResponse> {
    public constructor(
        @Inject private readonly identityController: IdentityController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(): Promise<Result<InitiateIdentityDeletionResponse>> {
        const identityDeletionProcess = await this.identityController.initiateIdentityDeletion();

        await this.accountController.syncDatawallet();

        return Result.ok({ identityDeletionProcess: IdentityDeletionMapper.toIdentityDeletionProcessDTO(identityDeletionProcess) });
    }
}
