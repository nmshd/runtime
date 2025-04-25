import { Result } from "@js-soft/ts-utils";
import { CoreError } from "@nmshd/core-types";
import { CryptoSignature } from "@nmshd/crypto";
import { Challenge, ChallengeController, ChallengeSigned } from "@nmshd/transport";
import { Inject } from "@nmshd/typescript-ioc";
import { nameof } from "ts-simple-nameof";
import { RelationshipDTO } from "../../../types";
import { RuntimeErrors, SchemaRepository, SchemaValidator, UseCase, ValidationFailure, ValidationResult } from "../../common";
import { RelationshipMapper } from "../relationships/RelationshipMapper";

export interface ValidateChallengeRequest {
    challengeString: string;
    signature: string;
}

export interface ValidateChallengeResponse {
    isValid: boolean;
    correspondingRelationship?: RelationshipDTO;
}

class Validator extends SchemaValidator<ValidateChallengeRequest> {
    public constructor(@Inject schemaRepository: SchemaRepository) {
        super(schemaRepository.getSchema("ValidateChallengeRequest"));
    }

    public override validate(value: ValidateChallengeRequest): ValidationResult {
        const validationResult = super.validate(value);
        if (validationResult.isInvalid()) return validationResult;

        const signatureValidationResult = this.validateSignature(value.signature);
        if (signatureValidationResult.isError) {
            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue(signatureValidationResult.error.message),
                    nameof<ValidateChallengeRequest>((r) => r.signature)
                )
            );
        }

        const challengeValidationResult = this.validateChallenge(value.challengeString);
        if (challengeValidationResult.isError) {
            validationResult.addFailure(
                new ValidationFailure(
                    RuntimeErrors.general.invalidPropertyValue(challengeValidationResult.error.message),
                    nameof<ValidateChallengeRequest>((r) => r.challengeString)
                )
            );
        }

        return validationResult;
    }

    private validateSignature(signature: string): Result<void> {
        try {
            CryptoSignature.fromBase64(signature);
            return Result.ok(undefined);
        } catch {
            return Result.fail(RuntimeErrors.challenges.invalidSignature());
        }
    }

    private validateChallenge(challenge: string): Result<void> {
        try {
            Challenge.deserialize(challenge);
            return Result.ok(undefined);
        } catch {
            return Result.fail(RuntimeErrors.challenges.invalidChallengeString());
        }
    }
}

export class ValidateChallengeUseCase extends UseCase<ValidateChallengeRequest, ValidateChallengeResponse> {
    public constructor(
        @Inject private readonly challengeController: ChallengeController,
        @Inject private readonly relationshipMapper: RelationshipMapper,
        @Inject validator: Validator
    ) {
        super(validator);
    }

    protected async executeInternal(request: ValidateChallengeRequest): Promise<Result<ValidateChallengeResponse>> {
        const signature = CryptoSignature.fromBase64(request.signature);
        const signedChallenge = ChallengeSigned.from({
            challenge: request.challengeString,
            signature: signature
        });

        try {
            const success = await this.challengeController.validateChallenge(signedChallenge);

            const correspondingRelationship = success.correspondingRelationship ? this.relationshipMapper.toRelationshipDTO(success.correspondingRelationship) : undefined;
            return Result.ok({
                isValid: success.isValid,
                correspondingRelationship
            });
        } catch (e: unknown) {
            if (!(e instanceof CoreError) || e.code !== "error.transport.notSupported") throw e;

            return Result.fail(RuntimeErrors.general.notSupported("Validating challenges of the type 'Device' is not yet supported."));
        }
    }
}
