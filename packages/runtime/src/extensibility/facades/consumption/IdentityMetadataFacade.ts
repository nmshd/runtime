import { ApplicationError, Result } from "@js-soft/ts-utils";
import { Inject } from "typescript-ioc";
import { IdentityMetadataDTO } from "../../../types";
import {
    DeleteIdentityMetadataRequest,
    DeleteIdentityMetadataUseCase,
    GetIdentityMetadataRequest,
    GetIdentityMetadataUseCase,
    UpsertIdentityMetadataRequest,
    UpsertIdentityMetadataUseCase
} from "../../../useCases";

export class IdentityMetadataFacade {
    public constructor(
        @Inject private readonly upsertIdentityMetadataUseCase: UpsertIdentityMetadataUseCase,
        @Inject private readonly deleteIdentityMetadataUseCase: DeleteIdentityMetadataUseCase,
        @Inject private readonly getIdentityMetadataUseCase: GetIdentityMetadataUseCase
    ) {}

    public async getIdentityMetadata(request: GetIdentityMetadataRequest): Promise<Result<IdentityMetadataDTO, ApplicationError>> {
        return await this.getIdentityMetadataUseCase.execute(request);
    }

    public async deleteIdentityMetadata(request: DeleteIdentityMetadataRequest): Promise<Result<void, ApplicationError>> {
        return await this.deleteIdentityMetadataUseCase.execute(request);
    }

    public async upsertIdentityMetadata(request: UpsertIdentityMetadataRequest): Promise<Result<IdentityMetadataDTO, ApplicationError>> {
        return await this.upsertIdentityMetadataUseCase.execute(request);
    }
}
