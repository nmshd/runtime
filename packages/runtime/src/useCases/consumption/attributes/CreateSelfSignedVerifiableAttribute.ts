import { Result } from "@js-soft/ts-utils";
import { AttributesController, CreateRepositoryAttributeParams, getVCProcessor } from "@nmshd/consumption";
import { IdentityAttributeJSON, SupportedVCTypes } from "@nmshd/content";
import { AccountController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { LocalAttributeDTO } from "../../../types";
import { SchemaRepository, SchemaValidator, UseCase } from "../../common";
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
        const params = CreateRepositoryAttributeParams.from({
            content: request.content
        });
        const vc = await getVCProcessor(SupportedVCTypes.SdJwtVc, this.accountController);

        const signedCredential = await vc.sign(parsedRequestAttribute, request.subjectDid);
        params.content.proof = { credential: signedCredential, credentialType: SupportedVCTypes.SdJwtVc };

        const createdAttribute = await this.attributeController.createRepositoryAttribute(params);
        await this.accountController.syncDatawallet();

        return Result.ok(AttributeMapper.toAttributeDTO(createdAttribute));
    }
}
