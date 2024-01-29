import { Result } from "@js-soft/ts-utils";
import { CoreId, Token, TokenController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { QRCode, RuntimeErrors, SchemaRepository, SchemaValidator, TokenIdString, UseCase } from "../../common";

export interface GetQRCodeForTokenRequest {
    id: TokenIdString;
}

class Validator extends SchemaValidator<GetQRCodeForTokenRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("GetQRCodeForTokenRequest"));
    }
}

export interface GetQRCodeForTokenResponse {
    qrCodeBytes: string;
}

export class GetQRCodeForTokenUseCase extends UseCase<GetQRCodeForTokenRequest, GetQRCodeForTokenResponse> {
    public constructor(
        @Inject private readonly tokenController: TokenController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: GetQRCodeForTokenRequest): Promise<Result<GetQRCodeForTokenResponse>> {
        const token = await this.tokenController.getToken(CoreId.from(request.id));

        if (!token) {
            return Result.fail(RuntimeErrors.general.recordNotFound(Token));
        }

        const qrCode = await QRCode.forTruncateable(token);
        return Result.ok({ qrCodeBytes: qrCode.asBase64() });
    }
}
