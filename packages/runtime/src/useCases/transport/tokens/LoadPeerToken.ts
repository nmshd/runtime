import { Result } from "@js-soft/ts-utils";
import { CryptoSecretKey } from "@nmshd/crypto";
import { AccountController, CoreAddress, CoreId, Token, TokenController } from "@nmshd/transport";
import { Inject } from "typescript-ioc";
import { TokenDTO } from "../../../types";
import {
    AddressString,
    JsonSchema,
    RuntimeErrors,
    SchemaRepository,
    SchemaValidator,
    TokenIdString,
    TokenReferenceString,
    UseCase,
    ValidationFailure,
    ValidationResult
} from "../../common";
import { TokenMapper } from "./TokenMapper";

/**
 * @errorMessage token reference invalid
 */
export interface LoadPeerTokenViaReferenceRequest {
    reference: TokenReferenceString;
    ephemeral: boolean;
}

export interface LoadPeerTokenViaSecretRequest {
    id: TokenIdString;
    /**
     * @minLength 10
     */
    secretKey: string;
    ephemeral: boolean;
    forIdentity?: AddressString;
}

export type LoadPeerTokenRequest = LoadPeerTokenViaReferenceRequest | LoadPeerTokenViaSecretRequest;

function isLoadPeerTokenViaSecret(request: LoadPeerTokenRequest): request is LoadPeerTokenViaSecretRequest {
    return "id" in request && "secretKey" in request;
}

function isLoadPeerTokenViaReference(request: LoadPeerTokenRequest): request is LoadPeerTokenViaReferenceRequest {
    return "reference" in request;
}

class Validator extends SchemaValidator<LoadPeerTokenRequest> {
    private readonly loadViaSecretSchema: JsonSchema;
    private readonly loadViaReferenceSchema: JsonSchema;

    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("LoadPeerTokenRequest"));
        this.loadViaSecretSchema = schemaRepository.getSchema("LoadPeerTokenViaSecretRequest");
        this.loadViaReferenceSchema = schemaRepository.getSchema("LoadPeerTokenViaReferenceRequest");
    }

    public override validate(input: LoadPeerTokenRequest): ValidationResult {
        if (this.schema.validate(input).isValid) return new ValidationResult();

        // any-of in combination with missing properties is a bit weird
        // when { reference: null | undefined } is passed, it ignores reference
        // and treats it like a LoadPeerTokenViaSecret.
        // That's why we validate with the specific schema afterwards
        if (isLoadPeerTokenViaReference(input)) {
            return this.convertValidationResult(this.loadViaReferenceSchema.validate(input));
        } else if (isLoadPeerTokenViaSecret(input)) {
            return this.convertValidationResult(this.loadViaSecretSchema.validate(input));
        }

        const result = new ValidationResult();
        result.addFailure(new ValidationFailure(RuntimeErrors.general.invalidPayload()));
        return result;
    }
}

export class LoadPeerTokenUseCase extends UseCase<LoadPeerTokenRequest, TokenDTO> {
    public constructor(
        @Inject private readonly tokenController: TokenController,
        @Inject private readonly accountController: AccountController,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: LoadPeerTokenRequest): Promise<Result<TokenDTO>> {
        let createdToken: Token;

        if (isLoadPeerTokenViaSecret(request)) {
            const key = CryptoSecretKey.fromBase64(request.secretKey);
            createdToken = await this.tokenController.loadPeerToken(
                CoreId.from(request.id),
                key,
                request.ephemeral,
                request.forIdentity ? CoreAddress.from(request.forIdentity) : undefined
            );
        } else if (isLoadPeerTokenViaReference(request)) {
            createdToken = await this.tokenController.loadPeerTokenByTruncated(request.reference, request.ephemeral);
        } else {
            throw new Error("Invalid request format.");
        }

        if (!request.ephemeral) {
            await this.accountController.syncDatawallet();
        }

        return Result.ok(TokenMapper.toTokenDTO(createdToken, request.ephemeral));
    }
}
