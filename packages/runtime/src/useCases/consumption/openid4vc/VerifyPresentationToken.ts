import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { TokenContentVerifiablePresentation, TokenContentVerifiablePresentationJSON } from "@nmshd/content";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface VerifyPresentationTokenRequest {
    tokenContent: TokenContentVerifiablePresentationJSON;
    expectedNonce: string;
}

export interface VerifyPresentationTokenResponse {
    isValid: boolean;
    error?: Error;
}

class Validator extends SchemaValidator<VerifyPresentationTokenRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("VerifyPresentationTokenRequest"));
    }
}

export class VerifyPresentationTokenUseCase extends UseCase<VerifyPresentationTokenRequest, VerifyPresentationTokenResponse> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: VerifyPresentationTokenRequest): Promise<Result<VerifyPresentationTokenResponse>> {
        const verificationResult = await this.openId4VcController.verifyPresentationTokenContent(
            TokenContentVerifiablePresentation.from(request.tokenContent),
            request.expectedNonce
        );

        return Result.ok(verificationResult);
    }
}
