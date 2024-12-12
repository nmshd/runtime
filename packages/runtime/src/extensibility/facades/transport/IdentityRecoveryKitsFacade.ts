import { Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { TokenDTO } from "../../../types";
import { CreateIdentityRecoveryKitRequest, CreateIdentityRecoveryKitUseCase, DoesIdentityRecoveryKitExistResponse, DoesIdentityRecoveryKitExistUseCase } from "../../../useCases";

export class IdentityRecoveryKitsFacade {
    public constructor(
        @Inject private readonly createIdentityRecoveryKitUseCase: CreateIdentityRecoveryKitUseCase,
        @Inject private readonly existsIdentityRecoveryKitUseCase: DoesIdentityRecoveryKitExistUseCase
    ) {}

    public async createIdentityRecoveryKit(request: CreateIdentityRecoveryKitRequest): Promise<Result<TokenDTO>> {
        return await this.createIdentityRecoveryKitUseCase.execute(request);
    }

    public async doesIdentityRecoveryKitExist(): Promise<Result<DoesIdentityRecoveryKitExistResponse>> {
        return await this.existsIdentityRecoveryKitUseCase.execute();
    }
}
