import { ClaimFormat, W3cJsonCredential } from "@credo-ts/core";
import { OpenId4VciCredentialResponse } from "@credo-ts/openid4vc";
import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController } from "@nmshd/consumption";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "../attributes";

export interface AbstractStoreCredentialsRequest<T> {
    credentialResponses: T;
}

export interface StoreCredentialsRequest extends AbstractStoreCredentialsRequest<
    (Omit<OpenId4VciCredentialResponse, "record"> & { record: { claimFormat: ClaimFormat; encoded: string | W3cJsonCredential } })[]
> {}

export interface SchemaValidatableStoreCredentialsRequest extends AbstractStoreCredentialsRequest<Record<string, any>[]> {}

class Validator extends SchemaValidator<StoreCredentialsRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("StoreCredentialsRequest"));
    }
}

export class StoreCredentialsUseCase extends UseCase<StoreCredentialsRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: StoreCredentialsRequest): Promise<Result<LocalAttributeDTO>> {
        const result = await this.openId4VcController.storeCredentials(request.credentialResponses);
        return Result.ok(AttributeMapper.toAttributeDTO(result));
    }
}
