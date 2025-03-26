import { Result } from "@js-soft/ts-utils";
import { getVCProcessor } from "@nmshd/consumption";
import { SupportedVCTypes } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface CreateVerifiableCredentialRequest {
    content: any;
    subjectDid: string;
    credentialType: SupportedVCTypes;
}

class Validator extends SchemaValidator<CreateVerifiableCredentialRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateVerifiableCredentialRequest"));
    }
}

export class CreateVerifiableCredentialUseCase extends UseCase<CreateVerifiableCredentialRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateVerifiableCredentialRequest): Promise<Result<any>> {
        const vc = await getVCProcessor(request.credentialType, this.accountController);

        const signedCredential = await vc.issue(request.content, request.subjectDid);

        return Result.ok(signedCredential);
    }
}
