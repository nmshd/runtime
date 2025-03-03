import { VerifiableCredentialController } from "@blubi/vc";
import { Result } from "@js-soft/ts-utils";
import { CreateAttributeRequestItem, CreateAttributeRequestItemJSON, IdentityAttributeJSON } from "@nmshd/content";
import { CoreBuffer } from "@nmshd/crypto";
import { AccountController, DeviceSecretType } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
import { buildCredential } from "../verifiableCredentials/core";

export interface CreateCreateVerifiableAttributeRequestItemRequest {
    content: IdentityAttributeJSON;
    peer: string;
    mustBeAccepted: boolean;
}

class Validator extends SchemaValidator<CreateCreateVerifiableAttributeRequestItemRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateCreateVerifiableAttributeRequestItemRequest"));
    }
}

export class CreateCreateVerifiableAttributeRequestItemUseCase extends UseCase<CreateCreateVerifiableAttributeRequestItemRequest, CreateAttributeRequestItemJSON> {
    public constructor(
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateCreateVerifiableAttributeRequestItemRequest): Promise<Result<CreateAttributeRequestItemJSON>> {
        const parsedRequestAttribute = JSON.parse(JSON.stringify(request.content));
        const multikeyPublic = `z${CoreBuffer.from([0xed, 0x01]).append(this.accountController.identity.identity.publicKey.publicKey).toBase58()}`;
        const identityPrivateKey = ((await this.accountController.activeDevice.secrets.loadSecret(DeviceSecretType.IdentitySignature)) as any)!.secret["privateKey"];
        const multikeyPrivate = `z${CoreBuffer.from([0x80, 0x26]).append(identityPrivateKey).toBase58()}`;

        const vc = await VerifiableCredentialController.initialize();
        const credential = buildCredential(parsedRequestAttribute.value, request.peer, multikeyPublic);

        const signedCredential = await vc.sign(credential, multikeyPublic, multikeyPrivate);
        request.content.proof = signedCredential;

        return Result.ok(
            CreateAttributeRequestItem.from({
                attribute: request.content,
                mustBeAccepted: request.mustBeAccepted
            }).toJSON()
        );
    }
}
