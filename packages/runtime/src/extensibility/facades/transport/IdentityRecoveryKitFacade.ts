import { Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { TokenDTO } from "../../../types";
import { CreateIdentityRecoveryKitRequest, CreateIdentityRecoveryKitUseCase, ExistsIdentityRecoveryKitResponse, ExistsIdentityRecoveryKitUseCase } from "../../../useCases";

export class IdentityRecoveryKitFacade {
    public constructor(
        @Inject private readonly createIdentityRecoveryKitUseCase: CreateIdentityRecoveryKitUseCase,
        @Inject private readonly existsIdentityRecoveryKitUseCase: ExistsIdentityRecoveryKitUseCase
    ) {}

    public async createIdentityRecoveryKit(request: CreateIdentityRecoveryKitRequest): Promise<Result<TokenDTO>> {
        return await this.createIdentityRecoveryKitUseCase.execute(request);
    }

    public async existsIdentityRecoveryKit(): Promise<Result<ExistsIdentityRecoveryKitResponse>> {
        return await this.existsIdentityRecoveryKitUseCase.execute();
    }
}
