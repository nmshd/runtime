import { Result } from "@js-soft/ts-utils";
import { FileReference } from "@nmshd/core-types";
import {
    AccountController,
    FileController,
    RelationshipTemplateController,
    RelationshipTemplateReference,
    Token,
    TokenContentDeviceSharedSecret,
    TokenContentFile,
    TokenContentRelationshipTemplate,
    TokenController,
    TokenReference
} from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
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

export interface LoadItemFromReferenceRequest {
    reference: TokenReferenceString | FileReferenceString | RelationshipTemplateReferenceString;
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
        const reference = request.reference;

        if (reference.startsWith(Base64ForIdPrefix.RelationshipTemplate)) {
            const template = await this.templateController.loadPeerRelationshipTemplateByReference(RelationshipTemplateReference.from(reference), request.password);
            return Result.ok({
                type: "RelationshipTemplate",
                value: RelationshipTemplateMapper.toRelationshipTemplateDTO(template)
            });
        }

        if (reference.startsWith(Base64ForIdPrefix.File)) {
            const file = await this.fileController.getOrLoadFileByReference(FileReference.from(reference));
            return Result.ok({
                type: "File",
                value: FileMapper.toFileDTO(file)
            });
        }

        return await this.handleTokenReference(reference, request.password);
    }

    private async handleTokenReference(tokenReference: string, password?: string): Promise<Result<LoadItemFromReferenceResponse>> {
        const token = await this.tokenController.loadPeerTokenByReference(TokenReference.from(tokenReference), true, password);

        if (!token.cache) {
            throw RuntimeErrors.general.cacheEmpty(Token, token.id.toString());
        }

        const tokenContent = token.cache.content;

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
