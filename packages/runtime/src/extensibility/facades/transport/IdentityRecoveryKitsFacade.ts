import { Result } from "@js-soft/ts-utils";
import { Inject } from "@nmshd/typescript-ioc";
import { TokenDTO } from "../../../types";
import {
    CheckForExistingIdentityRecoveryKitResponse,
    CheckForExistingIdentityRecoveryKitUseCase,
    CreateIdentityRecoveryKitRequest,
    CreateIdentityRecoveryKitUseCase
} from "../../../useCases";

export class IdentityRecoveryKitsFacade {
    public constructor(
        @Inject private readonly createIdentityRecoveryKitUseCase: CreateIdentityRecoveryKitUseCase,
        @Inject private readonly checkForExistingIdentityRecoveryKitUseCase: CheckForExistingIdentityRecoveryKitUseCase
    ) {}

    public async createIdentityRecoveryKit(request: CreateIdentityRecoveryKitRequest): Promise<Result<TokenDTO>> {
        return await this.createIdentityRecoveryKitUseCase.execute(request);
    }

    public async checkForExistingIdentityRecoveryKit(): Promise<Result<CheckForExistingIdentityRecoveryKitResponse>> {
        return await this.checkForExistingIdentityRecoveryKitUseCase.execute();
    }
}
