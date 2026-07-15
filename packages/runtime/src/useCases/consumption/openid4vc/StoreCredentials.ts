import { Result } from "@js-soft/ts-utils";
import { OpenId4VcController, OpenId4VciCredentialResponseJSON } from "@nmshd/consumption";
import { LocalAttributeDTO } from "@nmshd/runtime-types";
import { FileController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { AttributeMapper } from "../attributes";

export interface AbstractStoreCredentialsRequest<T> {
    credentialResponses: T;
}

export interface StoreCredentialsRequest extends AbstractStoreCredentialsRequest<OpenId4VciCredentialResponseJSON[]> {}

export interface SchemaValidatableStoreCredentialsRequest extends AbstractStoreCredentialsRequest<Record<string, any>[]> {}

class Validator extends SchemaValidator<StoreCredentialsRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("StoreCredentialsRequest"));
    }
}

export class StoreCredentialsUseCase extends UseCase<StoreCredentialsRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly openId4VcController: OpenId4VcController,
        @Inject private readonly fileController: FileController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected override async executeInternal(request: StoreCredentialsRequest): Promise<Result<LocalAttributeDTO>> {
        const attribute = await this.openId4VcController.storeCredentials(request.credentialResponses);

        const displayInformation = attribute.content.value.displayInformation;
        if (displayInformation) {
            attribute.content.value.displayInformationCachedImages = await this.fileController.cacheVerifiableCredentialDisplayInformationImages(displayInformation);
        }

        return Result.ok(AttributeMapper.toAttributeDTO(attribute));
    }
}
