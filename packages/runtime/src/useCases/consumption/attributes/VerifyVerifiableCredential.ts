import { VerifiableCredentialController } from "@blubi/vc";
import { Result } from "@js-soft/ts-utils";
import { AttributesController } from "@nmshd/consumption";
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
        @Inject private readonly attributeController: AttributesController,
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

        if (!(request.attribute.proof as any).issuer) {
            return Result.ok({
                success: false,
                message: "No proof value"
            });
        }

        const vc = await VerifiableCredentialController.initialize();

        const validationResult = await vc.verify(request.attribute.proof);
        if (request.validIssuers) {
            if (!request.validIssuers.includes((request.attribute.proof as any).issuer)) {
                return Result.ok({
                    success: false,
                    message: "The issuer is not trusted"
                });
            }
        }

        return Result.ok({
            success: validationResult.verified
        });
    }
}

export interface VerifiableCredentialValidationResult {
    success: boolean;
    message?: string;
}
