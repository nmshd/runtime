import { Result } from "@js-soft/ts-utils";
import { IdentityMetadataDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
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

    public async getIdentityMetadata(request: GetIdentityMetadataRequest): Promise<Result<IdentityMetadataDTO>> {
        return await this.getIdentityMetadataUseCase.execute(request);
    }

    public async deleteIdentityMetadata(request: DeleteIdentityMetadataRequest): Promise<Result<void>> {
        return await this.deleteIdentityMetadataUseCase.execute(request);
    }

    public async upsertIdentityMetadata(request: UpsertIdentityMetadataRequest): Promise<Result<IdentityMetadataDTO>> {
        return await this.upsertIdentityMetadataUseCase.execute(request);
    }
}
