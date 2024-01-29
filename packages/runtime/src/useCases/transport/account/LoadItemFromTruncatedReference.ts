import { Result } from "@js-soft/ts-utils";
import {
    AccountController,
    FileController,
    RelationshipTemplateController,
    Token,
    TokenContentDeviceSharedSecret,
    TokenContentFile,
    TokenContentRelationshipTemplate,
    TokenController
} from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { DeviceOnboardingInfoDTO, FileDTO, RelationshipTemplateDTO, TokenDTO } from "../../../types";
import {
    Base64ForIdPrefix,
    FileReferenceString,
    RelationshipTemplateReferenceString,
    RuntimeErrors,
    SchemaRepository,
    SchemaValidator,
    TokenReferenceString,
    UseCase
} from "../../common";
import { DeviceMapper } from "../devices/DeviceMapper";
import { FileMapper } from "../files/FileMapper";
import { RelationshipTemplateMapper } from "../relationshipTemplates/RelationshipTemplateMapper";
import { TokenMapper } from "../tokens/TokenMapper";

export interface LoadItemFromTruncatedReferenceRequest {
    reference: TokenReferenceString | FileReferenceString | RelationshipTemplateReferenceString;
}

class Validator extends SchemaValidator<LoadItemFromTruncatedReferenceRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("LoadItemFromTruncatedReferenceRequest"));
    }
}

export type LoadItemFromTruncatedReferenceResponse =
    | { type: "Token"; value: TokenDTO }
    | { type: "File"; value: FileDTO }
    | { type: "RelationshipTemplate"; value: RelationshipTemplateDTO }
    | { type: "DeviceOnboardingInfo"; value: DeviceOnboardingInfoDTO };

export class LoadItemFromTruncatedReferenceUseCase extends UseCase<LoadItemFromTruncatedReferenceRequest, LoadItemFromTruncatedReferenceResponse> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject private readonly templateController: RelationshipTemplateController,
        @Inject private readonly tokenController: TokenController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: LoadItemFromTruncatedReferenceRequest): Promise<Result<LoadItemFromTruncatedReferenceResponse>> {
        try {
            return await this._executeInternal(request);
        } finally {
            await this.accountController.syncDatawallet();
        }
    }

    private async _executeInternal(request: LoadItemFromTruncatedReferenceRequest): Promise<Result<LoadItemFromTruncatedReferenceResponse>> {
        const reference = request.reference;

        if (reference.startsWith(Base64ForIdPrefix.RelationshipTemplate)) {
            const template = await this.templateController.loadPeerRelationshipTemplateByTruncated(reference);
            return Result.ok({
                type: "RelationshipTemplate",
                value: RelationshipTemplateMapper.toRelationshipTemplateDTO(template)
            });
        }

        if (reference.startsWith(Base64ForIdPrefix.File)) {
            const file = await this.fileController.getOrLoadFileByTruncated(reference);
            return Result.ok({
                type: "File",
                value: FileMapper.toFileDTO(file)
            });
        }

        return await this.handleTokenReference(reference);
    }

    private async handleTokenReference(tokenReference: string): Promise<Result<LoadItemFromTruncatedReferenceResponse>> {
        const token = await this.tokenController.loadPeerTokenByTruncated(tokenReference, true);

        if (!token.cache) {
            throw RuntimeErrors.general.cacheEmpty(Token, token.id.toString());
        }

        const tokenContent = token.cache.content;

        if (tokenContent instanceof TokenContentRelationshipTemplate) {
            const template = await this.templateController.loadPeerRelationshipTemplate(tokenContent.templateId, tokenContent.secretKey);
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
