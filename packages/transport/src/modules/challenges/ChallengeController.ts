import { log } from "@js-soft/ts-utils";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoSignatureKeypair } from "@nmshd/crypto";
import { CoreCrypto, TransportCoreErrors } from "../../core/index.js";
import { ControllerName, TransportController } from "../../core/TransportController.js";
import { AccountController } from "../accounts/AccountController.js";
import { Relationship } from "../relationships/local/Relationship.js";
import { RelationshipStatus } from "../relationships/transmission/RelationshipStatus.js";
import { ChallengeAuthClient } from "./backbone/ChallengeAuthClient.js";
import { ChallengeClient } from "./backbone/ChallengeClient.js";
import { Challenge, ChallengeType } from "./data/Challenge.js";
import { ChallengeSigned } from "./data/ChallengeSigned.js";

export class ChallengeController extends TransportController {
    private client: ChallengeClient;
    private authClient: ChallengeAuthClient;

    public constructor(parent: AccountController) {
        super(ControllerName.Challenge, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.client = new ChallengeClient(this.config, this.transport.correlator);
        this.authClient = new ChallengeAuthClient(this.config, this.parent.authenticator, this.transport.correlator);
        return this;
    }

    @log()
    private async validateChallengeLocally(challenge: Challenge, signedChallenge: ChallengeSigned): Promise<{ isValid: boolean; correspondingRelationship?: Relationship }> {
        if (!challenge.createdBy) return { isValid: false };

        const relationship = await this.parent.relationships.getActiveRelationshipToIdentity(challenge.createdBy);
        if (!relationship) {
            throw TransportCoreErrors.general.recordNotFound(Relationship, challenge.createdBy.toString());
        }
        const challengeBuffer = CoreBuffer.fromUtf8(signedChallenge.challenge);
        let isValid = false;
        switch (challenge.type) {
            case ChallengeType.Identity:
                isValid = await this.parent.relationships.verifyIdentity(relationship, challengeBuffer, signedChallenge.signature);
                break;
            case ChallengeType.Device:
                throw TransportCoreErrors.general.notSupported();
            case ChallengeType.Relationship:
                isValid = await this.parent.relationships.verify(relationship, challengeBuffer, signedChallenge.signature);
                break;
        }

        if (!isValid) return { isValid: false };

        return { isValid: true, correspondingRelationship: relationship };
    }

    public async validateChallenge(signedChallenge: ChallengeSigned, requiredType?: ChallengeType): Promise<{ isValid: boolean; correspondingRelationship?: Relationship }> {
        const challenge = Challenge.deserialize(signedChallenge.challenge);
        if (requiredType && challenge.type !== requiredType) return { isValid: false };
        if (challenge.expiresAt.isExpired()) return { isValid: false };

        const backboneChallengeResponse = await this.authClient.getChallenge(challenge.id.toString());
        if (backboneChallengeResponse.isError) return { isValid: false };

        if (backboneChallengeResponse.value.id !== challenge.id.toString()) return { isValid: false };

        if (challenge.createdBy && backboneChallengeResponse.value.createdBy !== challenge.createdBy.toString()) {
            return { isValid: false };
        }

        return await this.validateChallengeLocally(challenge, signedChallenge);
    }

    public async createAccountCreationChallenge(identity: CryptoSignatureKeypair): Promise<ChallengeSigned> {
        const backboneResponse = (await this.client.createChallenge()).value;
        const challenge = Challenge.from({
            id: CoreId.from(backboneResponse.id),
            expiresAt: CoreDate.from(backboneResponse.expiresAt),
            type: ChallengeType.Identity
        });
        const serializedChallenge = challenge.serialize(false);
        const challengeBuffer = CoreBuffer.fromUtf8(serializedChallenge);
        const signature = await CoreCrypto.sign(challengeBuffer, identity.privateKey);
        const signedChallenge = ChallengeSigned.from({
            challenge: serializedChallenge,
            signature: signature
        });
        return signedChallenge;
    }

    @log()
    public async createChallenge(type: ChallengeType = ChallengeType.Identity, relationship?: Relationship): Promise<ChallengeSigned> {
        if (type === ChallengeType.Relationship && relationship?.status !== RelationshipStatus.Active) {
            throw TransportCoreErrors.challenges.challengeTypeRequiresActiveRelationship();
        }

        const backboneResponse = (await this.authClient.createChallenge()).value;
        const challenge = Challenge.from({
            id: CoreId.from(backboneResponse.id),
            expiresAt: CoreDate.from(backboneResponse.expiresAt),
            createdBy: backboneResponse.createdBy ? CoreAddress.from(backboneResponse.createdBy) : undefined,
            createdByDevice: backboneResponse.createdByDevice ? CoreId.from(backboneResponse.createdByDevice) : undefined,
            type: type
        });

        const serializedChallenge = challenge.serialize(false);
        const challengeBuffer = CoreBuffer.fromUtf8(serializedChallenge);
        let signature;
        switch (type) {
            case ChallengeType.Identity:
                signature = await this.parent.identity.sign(challengeBuffer);
                break;
            case ChallengeType.Device:
                signature = await this.parent.activeDevice.sign(challengeBuffer);
                break;
            case ChallengeType.Relationship:
                signature = await this.parent.relationships.sign(relationship!, challengeBuffer);
                break;
        }

        const signedChallenge = ChallengeSigned.from({
            challenge: serializedChallenge,
            signature: signature
        });
        return signedChallenge;
    }
}
