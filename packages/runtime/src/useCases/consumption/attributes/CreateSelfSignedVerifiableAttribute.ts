import { VerifiableCredentialController } from "@blubi/vc";
import { Result } from "@js-soft/ts-utils";
import { AttributesController, CreateRepositoryAttributeParams } from "@nmshd/consumption";
import { IdentityAttributeJSON } from "@nmshd/content";
import { CoreBuffer } from "@nmshd/crypto";
import { AccountController, DeviceSecretType } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { buildCredential } from "../verifiableCredentials/core";
import { AttributeMapper } from "./AttributeMapper";

export interface CreateSelfSignedVerifiableAttributeRequest {
    content: IdentityAttributeJSON;
    subjectDid: string;
}

class Validator extends SchemaValidator<CreateSelfSignedVerifiableAttributeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateVerifiableAttributeRequest"));
    }
}

export class CreateSelfSignedVerifiableAttributeUseCase extends UseCase<CreateSelfSignedVerifiableAttributeRequest, LocalAttributeDTO> {
    public constructor(
        @Inject private readonly attributeController: AttributesController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateSelfSignedVerifiableAttributeRequest): Promise<Result<LocalAttributeDTO>> {
        const parsedRequestAttribute = JSON.parse(JSON.stringify(request.content));
        const multikeyPublic = `z${CoreBuffer.from([0xed, 0x01]).append(this["accountController"].identity.identity.publicKey.publicKey).toBase58()}`;
        const identityPrivateKey = ((await this["accountController"].activeDevice.secrets.loadSecret(DeviceSecretType.IdentitySignature)) as any)!.secret["privateKey"];
        const multikeyPrivate = `z${CoreBuffer.from([0x80, 0x26]).append(identityPrivateKey).toBase58()}`;
        const params = CreateRepositoryAttributeParams.from({
            content: request.content
        });
        const vc = await VerifiableCredentialController.initialize();
        const credential = buildCredential(parsedRequestAttribute.value, request.subjectDid, multikeyPublic);

        const signedCredential = await vc.sign(credential, multikeyPublic, multikeyPrivate);
        params.content.proof = signedCredential;

        const createdAttribute = await this.attributeController.createRepositoryAttribute(params);
        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(createdAttribute));
    }
}
