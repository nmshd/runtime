import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { Serializable } from "@js-soft/ts-serval";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { CryptoSignature } from "@nmshd/crypto";
import { AccountController, Challenge, ChallengeSigned, ChallengeType, Relationship, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("ChallengeTest", function () {
    let connection: IDatabaseConnection;

    let transport: Transport;

    let recipient: AccountController;
    let sender: AccountController;
    let relationship: Relationship;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);

        sender = accounts[0];
        recipient = accounts[1];

        relationship = (await TestUtil.addRelationship(recipient, sender)).acceptedRelationshipPeer;
    });

    afterAll(async function () {
        await sender.close();
        await recipient.close();
        await connection.close();
    });

    test("sender should create a signed challenge", async function () {
        const challenge = await sender.challenges.createChallenge();
        expect(challenge).toBeInstanceOf(ChallengeSigned);
        expect(typeof challenge.challenge).toBe("string");
        expect(challenge.signature).toBeInstanceOf(CryptoSignature);

        const deserializedChallenge = Challenge.deserialize(challenge.challenge);
        expect(deserializedChallenge.createdBy).toBeInstanceOf(CoreAddress);
        expect(deserializedChallenge.expiresAt).toBeInstanceOf(CoreDate);
        expect(deserializedChallenge.type).toBe(ChallengeType.Identity);
        expect(deserializedChallenge.id).toBeInstanceOf(CoreId);
    });

    test("recipient should validate a signed challenge", async function () {
        const challenge = await sender.challenges.createChallenge();
        const serializedChallenge = challenge.serialize(true);
        const deserializedChallenge = Serializable.deserializeUnknown(serializedChallenge) as ChallengeSigned;
        const validationResult = await recipient.challenges.validateChallenge(deserializedChallenge);
        expect(validationResult).toBeDefined();
        expect(validationResult.isValid).toBe(true);
        expect(validationResult.correspondingRelationship).toBeDefined();
    });

    describe("on terminated relationship", function () {
        let terminatedRelationship: Relationship;
        let challenge: ChallengeSigned;
        beforeAll(async function () {
            challenge = await sender.challenges.createChallenge(ChallengeType.Relationship, relationship);
            terminatedRelationship = (await TestUtil.terminateRelationship(recipient, sender)).terminatedRelationshipPeer;
        });

        test("should not create a relationship challenge on terminated relationship", async function () {
            await expect(sender.challenges.createChallenge(ChallengeType.Relationship, terminatedRelationship)).rejects.toThrow(
                "error.transport.challenges.challengeTypeRequiresActiveRelationship"
            );
        });

        test("should still validate the challenge on a terminated relationship", async function () {
            const validationResult = await recipient.challenges.validateChallenge(challenge);
            expect(validationResult).toBeDefined();
            expect(validationResult.isValid).toBe(true);
            expect(validationResult.correspondingRelationship).toBeDefined();
        });
    });
});
