import { ApplicationError, Result } from "@js-soft/ts-utils";
import { VerifiableCredentialDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { ResolveCredentialOfferRequest, ResolveCredentialOfferUseCase } from "../../../useCases";

export class OpenId4VcFacade {
    public constructor(@Inject private readonly resolveCredentialOfferUseCase: ResolveCredentialOfferUseCase) {}

    public async resolveCredentialOffer(request: ResolveCredentialOfferRequest): Promise<Result<VerifiableCredentialDTO, ApplicationError>> {
        return await this.resolveCredentialOfferUseCase.execute(request);
    }
}
