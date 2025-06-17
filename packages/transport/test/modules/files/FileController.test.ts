import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import { AccountController, File, FileOwnershipLockedEvent, Transport } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("FileController", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;
    let sender: AccountController;
    let recipient: AccountController;
    let tempId1: CoreId;
    let tempId2: CoreId;
    let tempDate: CoreDate;

    function expectValidFiles(sentFile: File, receivedFile: File, nowMinusSeconds: CoreDate) {
        expect(sentFile.id.toString()).toBe(receivedFile.id.toString());
        expect(sentFile.cache).toBeDefined();
        expect(sentFile.cachedAt?.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(sentFile.cache?.createdBy.toString()).toBe(sender.identity.address.toString());
        expect(sentFile.cache?.owner.toString()).toBe(sender.identity.address.toString());
        expect(sentFile.cache?.createdByDevice.toString()).toBe(sender.activeDevice.id.toString());
        expect(sentFile.cache?.createdAt.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(receivedFile.cache).toBeDefined();
        expect(receivedFile.cachedAt?.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(receivedFile.cache?.createdBy.toString()).toBe(sender.identity.address.toString());
        expect(receivedFile.cache?.createdByDevice.toString()).toBe(sender.activeDevice.id.toString());
        expect(receivedFile.cache?.createdAt.isSameOrAfter(nowMinusSeconds)).toBe(true);
        expect(receivedFile.cache?.expiresAt).toStrictEqual(sentFile.cache!.expiresAt);
        expect(sentFile.cache!.description).toBe(receivedFile.cache!.description);
        expect(sentFile.cache!.title).toBe(receivedFile.cache!.title);
        expect(sentFile.cache!.tags).toStrictEqual(receivedFile.cache!.tags);
        expect(sentFile.cache!.filemodified?.toString()).toBe(receivedFile.cache!.filemodified?.toString());
        expect(sentFile.cache!.filename).toBe(receivedFile.cache!.filename);
        expect(sentFile.cache!.filesize).toBe(receivedFile.cache!.filesize);
        expect(sentFile.cache!.mimetype).toBe(receivedFile.cache!.mimetype);
        expect(sentFile.cache!.owner.toString()).toBe(receivedFile.cache!.owner.toString());
        expect(sentFile.cache!.ownerSignature.toBase64()).toBe(receivedFile.cache!.ownerSignature.toBase64());
        expect(sentFile.cache!.plaintextHash.toBase64()).toBe(receivedFile.cache!.plaintextHash.toBase64());
        expect(sentFile.cache!.cipherHash.toBase64()).toBe(receivedFile.cache!.cipherHash.toBase64());
        expect(sentFile.cache!.cipherKey.toBase64()).toBe(receivedFile.cache!.cipherKey.toBase64());
    }

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
        transport = TestUtil.createTransport();

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, connection, 2);
        sender = accounts[0];
        recipient = accounts[1];
    });

    afterAll(async function () {
        await sender.close();
        await recipient.close();
        await connection.close();
    });

    test("should send and receive a File", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const content = CoreBuffer.fromUtf8("Test");
        const sentFile = await TestUtil.uploadFile(sender, content);

        const reference = sentFile.toFileReference(sender.config.baseUrl);
        const receivedFile = await recipient.files.getOrLoadFileByReference(reference);
        tempId1 = sentFile.id;

        expectValidFiles(sentFile, receivedFile, tempDate);
    });

    test("should get the cached File", async function () {
        const sentFile = await sender.files.getFile(tempId1);
        const receivedFile = await recipient.files.getFile(tempId1);
        expect(sentFile).toBeDefined();
        expect(receivedFile).toBeDefined();
        expectValidFiles(sentFile!, receivedFile!, tempDate);
    });

    test("should send and receive a second File", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const content = CoreBuffer.fromUtf8("Test2");
        const sentFile = await TestUtil.uploadFile(sender, content);

        const reference = sentFile.toFileReference(sender.config.baseUrl);
        const receivedFile = await recipient.files.getOrLoadFileByReference(reference);
        tempId2 = sentFile.id;

        expectValidFiles(sentFile, receivedFile, tempDate);
    });

    test("should send and receive a third File", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const content = CoreBuffer.fromUtf8("Test3");
        const sentFile = await TestUtil.uploadFile(sender, content);

        const reference = sentFile.toFileReference(sender.config.baseUrl);
        const receivedFile = await recipient.files.getOrLoadFileByReference(reference);

        expectValidFiles(sentFile, receivedFile, tempDate);
    });

    test("should get the cached files", async function () {
        const sentFiles = await sender.files.getFiles();
        const receivedFiles = await recipient.files.getFiles();
        expect(sentFiles).toHaveLength(3);
        expect(receivedFiles).toHaveLength(3);
        expect(sentFiles[0].id.toString()).toBe(tempId1.toString());
        expect(sentFiles[1].id.toString()).toBe(tempId2.toString());
        expectValidFiles(sentFiles[0], receivedFiles[0], tempDate);
        expectValidFiles(sentFiles[1], receivedFiles[1], tempDate);
    });

    test("should set and get additional metadata", async function () {
        const creationTime = CoreDate.utc();
        await sender.files.setFileMetadata(tempId1, { myprop: true });

        const file = (await sender.files.getFile(tempId1))!;
        expect(file.metadata).toBeDefined();
        expect(file.metadata["myprop"]).toBe(true);
        expect(file.metadataModifiedAt).toBeDefined();
        expect(file.metadataModifiedAt!.isSameOrBefore(creationTime.add({ seconds: 1 }))).toBe(true);
        expect(file.metadataModifiedAt!.isSameOrAfter(creationTime.subtract({ seconds: 2 }))).toBe(true);
    });

    test("should mark File as viewed", async function () {
        const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));
        expect(file.wasViewedAt).toBeUndefined();

        const timeBeforeViewing = CoreDate.utc();
        const viewedFile = await sender.files.markFileAsViewed(file.id);
        const timeAfterViewing = CoreDate.utc();

        expect(viewedFile.wasViewedAt).toBeDefined();
        expect(viewedFile.wasViewedAt!.isSameOrAfter(timeBeforeViewing)).toBe(true);
        expect(viewedFile.wasViewedAt!.isSameOrBefore(timeAfterViewing)).toBe(true);
    });

    test("should mark File as unviewed", async function () {
        const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));
        const viewedFile = await sender.files.markFileAsViewed(file.id);
        expect(viewedFile.wasViewedAt).toBeDefined();

        const unviewedFile = await sender.files.markFileAsUnviewed(file.id);
        expect(unviewedFile.wasViewedAt).toBeUndefined();
    });

    test("should not change wasViewedAt of a viewed File", async function () {
        const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

        const viewedFile = await sender.files.markFileAsViewed(file.id);
        const firstViewedAt = viewedFile.wasViewedAt;

        const unchangedFile = await sender.files.markFileAsViewed(file.id);
        expect(unchangedFile.wasViewedAt).toBeDefined();
        expect(unchangedFile.wasViewedAt!.equals(firstViewedAt!)).toBe(true);
    });

    describe("File deletion", function () {
        let sentFile: File;
        let receivedFile: File;

        beforeEach(async function () {
            const content = CoreBuffer.fromUtf8("Test");
            sentFile = await TestUtil.uploadFile(sender, content);

            const reference = sentFile.toFileReference(sender.config.baseUrl);
            receivedFile = await recipient.files.getOrLoadFileByReference(reference);
        });

        test("should delete own file locally and from the Backbone", async function () {
            await sender.files.deleteFile(sentFile);
            const fileOnBackbone = await recipient.files.fetchCaches([sentFile.id]);
            expect(fileOnBackbone).toHaveLength(0);

            const localFile = await sender.files.getFile(sentFile.id);
            expect(localFile).toBeUndefined();
        });

        test("should delete a peer owned file only locally", async function () {
            await recipient.files.deleteFile(receivedFile);
            const fileOnBackbone = await sender.files.fetchCaches([sentFile.id]);
            expect(fileOnBackbone).toHaveLength(1);

            const localFile = await recipient.files.getFile(sentFile.id);
            expect(localFile).toBeUndefined();
        });
    });

    describe("File ownership", function () {
        test("should return an ownershipToken when sending a File", async function () {
            const file = await sender.files.sendFile({
                buffer: CoreBuffer.fromUtf8("Test"),
                filename: "Test.bin",
                filemodified: CoreDate.from("2019-09-30T00:00:00.000Z"),
                mimetype: "application/json",
                expiresAt: CoreDate.utc().add({ minutes: 5 })
            });

            expect(file.ownershipToken).toBeDefined();
        });

        test("should validate an ownershipToken as the owner", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            const result = await sender.files.validateFileOwnershipToken(file.id, file.ownershipToken!);
            expect(result.isValid).toBe(true);
        });

        test("should validate an ownershipToken as not the owner", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            const validationResult = await recipient.files.validateFileOwnershipToken(file.id, file.ownershipToken!);
            expect(validationResult.isValid).toBe(true);
        });

        test("should mark the ownership of a File as locked if validating the ownershipToken as not the owner fails", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            const validationResult = await recipient.files.validateFileOwnershipToken(file.id, "anInvalidToken");
            expect(validationResult.isValid).toBe(false);

            const updatedFile = (await TestUtil.syncUntilHasFile(sender, file.id))[0];
            expect(updatedFile.ownershipIsLocked).toBe(true);
        });

        test("should not mark the ownership of a File as locked if validating the ownershipToken as the owner fails", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            const validationResult = await sender.files.validateFileOwnershipToken(file.id, "anInvalidToken");
            expect(validationResult.isValid).toBe(false);

            await sender.syncEverything();
            const updatedFile = await sender.files.getFile(file.id);
            expect(updatedFile!.ownershipIsLocked).toBeUndefined();
        });

        test("should regenerate an ownershipToken as the owner", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            const updatedFile = await sender.files.regenerateFileOwnershipToken(file.id);
            expect(updatedFile.ownershipToken).toBeDefined();
            expect(updatedFile.ownershipToken).not.toBe(file.ownershipToken);
        });

        test("should not regenerate an ownershipToken as not the owner", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            await TestUtil.expectThrowsRequestErrorAsync(recipient.files.regenerateFileOwnershipToken(file.id), "error.platform.forbidden", 403);
        });

        test("should update a File after the ownership was transferred as the previous owner", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            await recipient.files.getOrLoadFile(file.id, file.secretKey);
            await recipient.files.claimFileOwnership(file.id, file.ownershipToken!);

            const updatedFile = (await TestUtil.syncUntilHasFile(sender, file.id))[0];
            expect(updatedFile.isOwn).toBe(false);
            expect(updatedFile.cache!.owner).toStrictEqual(recipient.identity.address);
            expect(updatedFile.ownershipToken).toBeUndefined();
        });

        test("should claim the ownership of a File with a valid ownershipToken as not the owner after loading it", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            await recipient.files.getOrLoadFile(file.id, file.secretKey);

            const updatedFile = await recipient.files.claimFileOwnership(file.id, file.ownershipToken!);
            expect(updatedFile.cache!.owner).toStrictEqual(recipient.identity.address);
            expect(updatedFile.isOwn).toBe(true);

            expect(updatedFile.ownershipToken).toBeDefined();
            expect(updatedFile.ownershipToken).not.toBe(file.ownershipToken);
        });

        test("should not be able to claim the ownership of a File with a valid ownershipToken as the owner", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            await expect(() => sender.files.claimFileOwnership(file.id, file.ownershipToken!)).rejects.toThrow("error.platform.validation.file.cannotClaimOwnershipOfOwnFile");
        });

        test("should not claim the ownership of a File with an invalid ownershipToken", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            await TestUtil.expectThrowsRequestErrorAsync(recipient.files.claimFileOwnership(file.id, "anInvalidToken"), "error.platform.forbidden", 403);
        });

        test("should mark the ownershipToken as invalid if an attempt is made to claim the ownership of a File with an invalid ownershipToken", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            await TestUtil.expectThrowsRequestErrorAsync(recipient.files.claimFileOwnership(file.id, "anInvalidToken"), "error.platform.forbidden", 403);

            const validateResult = await sender.files.validateFileOwnershipToken(file.id, file.ownershipToken!);
            expect(validateResult.isValid).toBe(false);
        });

        test("should receive an external event if an attempt is made to claim the ownership of a File with an invalid ownershipToken", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            const events: FileOwnershipLockedEvent[] = [];
            transport.eventBus.subscribeOnce(FileOwnershipLockedEvent, (event) => {
                events.push(event);
            });

            await TestUtil.expectThrowsRequestErrorAsync(recipient.files.claimFileOwnership(file.id, "anInvalidToken"), "error.platform.forbidden", 403);
            await TestUtil.syncUntilHasFile(sender, file.id);
            expect(events).toHaveLength(1);
        });

        test("should mark the ownership of a File as locked if an attempt is made to claim the ownership of a File with an invalid ownershipToken", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            await TestUtil.expectThrowsRequestErrorAsync(recipient.files.claimFileOwnership(file.id, "anInvalidToken"), "error.platform.forbidden", 403);

            const updatedFile = (await TestUtil.syncUntilHasFile(sender, file.id))[0];
            expect(updatedFile.ownershipIsLocked).toBe(true);
        });

        test("should not claim the ownership of a File that is locked", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            await TestUtil.expectThrowsRequestErrorAsync(recipient.files.claimFileOwnership(file.id, "anInvalidToken"), "error.platform.forbidden", 403);

            await TestUtil.expectThrowsRequestErrorAsync(recipient.files.claimFileOwnership(file.id, file.ownershipToken!), "error.platform.forbidden", 403);
        });

        test("should mark a File as unlocked upon the regeneration of an ownershipToken", async function () {
            const file = await TestUtil.uploadFile(sender, CoreBuffer.fromUtf8("Test"));

            await TestUtil.expectThrowsRequestErrorAsync(recipient.files.claimFileOwnership(file.id, "anInvalidToken"), "error.platform.forbidden", 403);

            const lockedFile = (await TestUtil.syncUntilHasFile(sender, file.id))[0];
            expect(lockedFile.ownershipIsLocked).toBe(true);

            const updatedFile = await sender.files.regenerateFileOwnershipToken(file.id);
            expect(updatedFile.ownershipIsLocked).toBeUndefined();
        });
    });
});
