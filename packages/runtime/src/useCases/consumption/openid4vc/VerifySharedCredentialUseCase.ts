import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { DCQLQueryJSON, VerifiableCredentialJSON } from "@nmshd/content";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface VerifySharedCredentialRequest {
    query: DCQLQueryJSON;
    credential: VerifiableCredentialJSON;
}

export type VerifySharedCredentialResponse = { verified: true } | { verified: false; reason: string };

class Validator extends SchemaValidator<VerifySharedCredentialRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("VerifySharedCredentialRequest"));
    }
}

export class VerifySharedCredentialUseCase extends UseCase<VerifySharedCredentialRequest, VerifySharedCredentialResponse> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: VerifySharedCredentialRequest): Promise<Result<VerifySharedCredentialResponse>> {
        const result = await this.openId4VcController.verifyPresentation(request.query, request.credential);
        return Result.ok(result);
    }
}
