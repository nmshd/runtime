import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { VerifiableCredentialDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";

export interface GetVerifiableCredentialsRequest {
    ids: string[] | undefined;
}

class Validator extends SchemaValidator<GetVerifiableCredentialsRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetVerifiableCredentialsRequest"));
    }
}

export class GetVerifiableCredentialsUseCase extends UseCase<GetVerifiableCredentialsRequest, VerifiableCredentialDTO[]> {
    public constructor(
        @Inject private readonly openId4VcContoller: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: GetVerifiableCredentialsRequest): Promise<Result<VerifiableCredentialDTO[]>> {
        const credentials = await this.openId4VcContoller.getVerifiableCredentials(request.ids);
        return Result.ok(credentials);
    }
}
