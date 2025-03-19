import { Result } from "@js-soft/ts-utils";
import { AbstractVCProcessor } from "@nmshd/consumption";
import { IdentityAttributeJSON, RelationshipAttributeJSON } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface VerifyVerifiableCredentialRequest {
    attribute: IdentityAttributeJSON | RelationshipAttributeJSON;
    validIssuers?: string[];
}

class Validator extends SchemaValidator<VerifyVerifiableCredentialRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("VerifyVerifiableCredentialRequest"));
    }
}

export class VerifyVerifiableCredentialUseCase extends UseCase<VerifyVerifiableCredentialRequest, VerifiableCredentialValidationResult> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: VerifyVerifiableCredentialRequest): Promise<Result<VerifiableCredentialValidationResult>> {
        if (!request.attribute.proof) {
            return Result.ok({
                success: false,
                message: "No proof value"
            });
        }

        const credentialType = request.attribute.proof.credentialType;

        const vc = await AbstractVCProcessor.getVCProcessor(credentialType, this.accountController);

        if (await vc.verify(request.attribute.proof)) return Result.ok({ success: true });

        return Result.ok({ success: false, message: "Invalid proof value" });
    }
}

export interface VerifiableCredentialValidationResult {
    success: boolean;
    message?: string;
}
