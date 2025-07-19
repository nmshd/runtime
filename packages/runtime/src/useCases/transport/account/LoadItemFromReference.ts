import { Result } from "@js-soft/ts-utils";
import { FileReference, Reference } from "@nmshd/core-types";
import { DeviceOnboardingInfoDTO, FileDTO, RelationshipTemplateDTO, TokenDTO } from "@nmshd/runtime-types";
import {
    AccountController,
    BackboneIds,
    FileController,
    RelationshipTemplateController,
    RelationshipTemplateReference,
    TokenContentDeviceSharedSecret,
    TokenContentFile,
    TokenContentRelationshipTemplate,
    TokenController,
    TokenReference
} from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import {
    FileReferenceString,
    RelationshipTemplateReferenceString,
    SchemaRepository,
    SchemaValidator,
    TokenReferenceString,
    URLFileReferenceString,
    URLRelationshipTemplateReferenceString,
    URLTokenReferenceString,
    UseCase
} from "../../common";
import { DeviceMapper } from "../devices/DeviceMapper";
import { FileMapper } from "../files/FileMapper";
import { RelationshipTemplateMapper } from "../relationshipTemplates/RelationshipTemplateMapper";
import { TokenMapper } from "../tokens/TokenMapper";

export interface LoadItemFromReferenceRequest {
    reference:
        | TokenReferenceString
        | FileReferenceString
        | RelationshipTemplateReferenceString
        | URLTokenReferenceString
        | URLFileReferenceString
        | URLRelationshipTemplateReferenceString;
    password?: string;
}

class Validator extends SchemaValidator<LoadItemFromReferenceRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("LoadItemFromReferenceRequest"));
    }
}

export type LoadItemFromReferenceResponse =
    | { type: "Token"; value: TokenDTO }
    | { type: "File"; value: FileDTO }
    | { type: "RelationshipTemplate"; value: RelationshipTemplateDTO }
    | { type: "DeviceOnboardingInfo"; value: DeviceOnboardingInfoDTO };

export class LoadItemFromReferenceUseCase extends UseCase<LoadItemFromReferenceRequest, LoadItemFromReferenceResponse> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject private readonly templateController: RelationshipTemplateController,
        @Inject private readonly tokenController: TokenController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: LoadItemFromReferenceRequest): Promise<Result<LoadItemFromReferenceResponse>> {
        try {
            return await this._executeInternal(request);
        } finally {
            await this.accountController.syncDatawallet();
        }
    }

    private async _executeInternal(request: LoadItemFromReferenceRequest): Promise<Result<LoadItemFromReferenceResponse>> {
        const reference = Reference.from(request.reference);

        if (BackboneIds.relationshipTemplate.validate(reference.id)) {
            const template = await this.templateController.loadPeerRelationshipTemplateByReference(RelationshipTemplateReference.from(reference), request.password);
            return Result.ok({
                type: "RelationshipTemplate",
                value: RelationshipTemplateMapper.toRelationshipTemplateDTO(template)
            });
        }

        if (BackboneIds.file.validate(reference.id.toString())) {
            const file = await this.fileController.getOrLoadFileByReference(FileReference.from(reference));
            return Result.ok({
                type: "File",
                value: FileMapper.toFileDTO(file)
            });
        }

        return await this.handleTokenReference(TokenReference.from(request.reference), request.password);
    }

    private async handleTokenReference(tokenReference: TokenReference, password?: string): Promise<Result<LoadItemFromReferenceResponse>> {
        const token = await this.tokenController.loadPeerTokenByReference(tokenReference, true, password);

        const tokenContent = token.content;

        if (tokenContent instanceof TokenContentRelationshipTemplate) {
            const template = await this.templateController.loadPeerRelationshipTemplateByTokenContent(tokenContent, password);
            return Result.ok({
                type: "RelationshipTemplate",
                value: RelationshipTemplateMapper.toRelationshipTemplateDTO(template)
            });
        }

        if (tokenContent instanceof TokenContentFile) {
            const file = await this.fileController.getOrLoadFile(tokenContent.fileId, tokenContent.secretKey);
            return Result.ok({
                type: "File",
                value: FileMapper.toFileDTO(file)
            });
        }

        if (tokenContent instanceof TokenContentDeviceSharedSecret) {
            return Result.ok({
                type: "DeviceOnboardingInfo",
                value: DeviceMapper.toDeviceOnboardingInfoDTO(tokenContent.sharedSecret)
            });
        }

        return Result.ok({
            type: "Token",
            value: TokenMapper.toTokenDTO(token, true)
        });
    }
}
