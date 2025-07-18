import { Result } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId, PasswordLocationIndicator } from "@nmshd/core-types";
import { TokenDTO } from "@nmshd/runtime-types";
import { AccountController, File, FileController, TokenContentFile, TokenController } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import {
    AddressString,
    FileIdString,
    ISO8601DateTimeString,
    PasswordProtectionMapper,
    RuntimeErrors,
    SchemaRepository,
    TokenAndTemplateCreationValidator,
    UseCase
} from "../../common";
import { TokenMapper } from "../tokens/TokenMapper";

export interface SchemaValidatableCreateTokenForFileRequest {
    fileId: FileIdString;
    expiresAt?: ISO8601DateTimeString;
    ephemeral?: boolean;
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

export type CreateTokenForFileRequest = SchemaValidatableCreateTokenForFileRequest & {
    passwordProtection?: { passwordLocationIndicator?: PasswordLocationIndicator };
};

class Validator extends TokenAndTemplateCreationValidator<CreateTokenForFileRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("CreateTokenForFileRequest"));
    }
}

export class CreateTokenForFileUseCase extends UseCase<CreateTokenForFileRequest, TokenDTO> {
    public constructor(
        @Inject private readonly fileController: FileController,
        @Inject private readonly tokenController: TokenController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: CreateTokenForFileRequest): Promise<Result<TokenDTO>> {
        const file = await this.fileController.getFile(CoreId.from(request.fileId));

        if (!file) {
            return Result.fail(RuntimeErrors.general.recordNotFound(File));
        }

        const tokenContent = TokenContentFile.from({
            fileId: file.id,
            secretKey: file.secretKey
        });

        const defaultTokenExpiry = file.expiresAt;
        const tokenExpiry = request.expiresAt ? CoreDate.from(request.expiresAt) : defaultTokenExpiry;

        const ephemeral = request.ephemeral ?? true;

        const token = await this.tokenController.sendToken({
            content: tokenContent,
            expiresAt: tokenExpiry,
            ephemeral,
            forIdentity: request.forIdentity ? CoreAddress.from(request.forIdentity) : undefined,
            passwordProtection: PasswordProtectionMapper.toPasswordProtectionCreationParameters(request.passwordProtection)
        });

        if (!ephemeral) {
            await this.accountController.syncDatawallet();
        }

        return Result.ok(TokenMapper.toTokenDTO(token, ephemeral));
    }
}
