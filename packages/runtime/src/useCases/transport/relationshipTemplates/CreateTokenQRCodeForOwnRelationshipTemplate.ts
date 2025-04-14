import { Result } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId, PasswordLocationIndicator, SharedPasswordProtection } from "@nmshd/core-types";
import { PasswordProtectionCreationParameters, RelationshipTemplate, RelationshipTemplateController, TokenContentRelationshipTemplate, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import {
    AddressString,
    ISO8601DateTimeString,
    QRCode,
    RelationshipTemplateIdString,
    RuntimeErrors,
    SchemaRepository,
    TokenAndTemplateCreationValidator,
    UseCase
} from "../../common";

export interface CreateTokenQRCodeForOwnTemplateRequest {
    templateId: RelationshipTemplateIdString;
    expiresAt?: ISO8601DateTimeString;
    forIdentity?: AddressString;
    passwordProtection?: {
        /**
         * @minLength 1
         */
        password: string;
        passwordIsPin?: true;
        passwordLocationIndicator?: unknown;
    };
}

class Validator extends TokenAndTemplateCreationValidator<CreateTokenQRCodeForOwnTemplateRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateTokenQRCodeForOwnTemplateRequest"));
    }
}

export interface CreateTokenQRCodeForOwnTemplateResponse {
    qrCodeBytes: string;
}

export class CreateTokenQRCodeForOwnTemplateUseCase extends UseCase<CreateTokenQRCodeForOwnTemplateRequest, CreateTokenQRCodeForOwnTemplateResponse> {
    public constructor(
        @Inject private readonly templateController: RelationshipTemplateController,
        @Inject private readonly tokenController: TokenController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateTokenQRCodeForOwnTemplateRequest): Promise<Result<CreateTokenQRCodeForOwnTemplateResponse>> {
        const template = await this.templateController.getRelationshipTemplate(CoreId.from(request.templateId));

        if (!template) {
            return Result.fail(RuntimeErrors.general.recordNotFound(RelationshipTemplate));
        }

        if (!template.isOwn) {
            return Result.fail(RuntimeErrors.relationshipTemplates.cannotCreateTokenForPeerTemplate());
        }

        if (template.cache?.forIdentity && request.forIdentity !== template.cache.forIdentity.toString()) {
            return Result.fail(RuntimeErrors.relationshipTemplates.personalizationMustBeInherited());
        }

        const tokenPasswordProtection = request.passwordProtection
            ? PasswordProtectionCreationParameters.create({
                  password: request.passwordProtection.password,
                  passwordIsPin: request.passwordProtection.passwordIsPin,
                  passwordLocationIndicator: request.passwordProtection.passwordLocationIndicator as PasswordLocationIndicator
              })
            : undefined;

        if (template.passwordProtection && !template.passwordProtection.matchesInputForNewPasswordProtection(tokenPasswordProtection)) {
            return Result.fail(RuntimeErrors.relationshipTemplates.passwordProtectionMustBeInherited());
        }

        const templatePasswordProtection = template.passwordProtection ? SharedPasswordProtection.from(template.passwordProtection) : undefined;

        const tokenContent = TokenContentRelationshipTemplate.from({
            templateId: template.id,
            secretKey: template.secretKey,
            forIdentity: template.cache!.forIdentity,
            passwordProtection: templatePasswordProtection
        });

        const defaultTokenExpiry = template.cache?.expiresAt ?? CoreDate.utc().add({ days: 12 });
        const tokenExpiry = request.expiresAt ? CoreDate.from(request.expiresAt) : defaultTokenExpiry;
        const token = await this.tokenController.sendToken({
            content: tokenContent,
            expiresAt: tokenExpiry,
            ephemeral: true,
            forIdentity: request.forIdentity ? CoreAddress.from(request.forIdentity) : undefined,
            passwordProtection: tokenPasswordProtection
        });

        const qrCode = await QRCode.forTruncateable(token);
        return Result.ok({ qrCodeBytes: qrCode.asBase64() });
    }
}
