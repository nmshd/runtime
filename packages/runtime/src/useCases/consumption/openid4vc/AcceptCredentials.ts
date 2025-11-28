import { OpenId4VciCredentialResponse } from "@credo-ts/openid4vc";
import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "../attributes";

export interface AbstractAcceptCredentialsRequest<T> {
    credentialResponses: T;
}

export interface AcceptCredentialsRequest extends AbstractAcceptCredentialsRequest<OpenId4VciCredentialResponse[]> {}

export interface SchemaValidatableAcceptCredentialsRequest extends AbstractAcceptCredentialsRequest<Record<string, any>[]> {}

class Validator extends SchemaValidator<AcceptCredentialsRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("AcceptCredentialsRequest"));
    }
}

export class AcceptCredentialsUseCase extends UseCase<AcceptCredentialsRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: AcceptCredentialsRequest): Promise<Result<LocalAttributeDTO>> {
        const result = await this.openId4VcController.acceptCredentials(request.credentialResponses);
        return Result.ok(AttributeMapper.toAttributeDTO(result));
    }
}
