import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface ResolveCredentialOfferRequest {
    credentialOfferUrl: string;
}

class Validator extends SchemaValidator<ResolveCredentialOfferRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ResolveCredentialOfferRequest"));
    }
}

export class ResolveCredentialOfferUseCase extends UseCase<ResolveCredentialOfferRequest, void> {
    public constructor(
        @Inject private readonly openId4VcContoller: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override executeInternal(request: ResolveCredentialOfferRequest): Promise<Result<void>> {
        return this.openId4VcContoller.processCredentialOffer(request.credentialOfferUrl).then(() => {
            return Result.ok<void>(undefined);
        });
    }
}
