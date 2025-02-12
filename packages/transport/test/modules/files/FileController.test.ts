import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate, CoreId } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import { AccountController, File, Transport } from "../../../src";
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
        transport = TestUtil.createTransport(connection);

        await transport.init();

        const accounts = await TestUtil.provideAccounts(transport, 2);
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

        const reference = sentFile.toFileReference().truncate();
        const receivedFile = await recipient.files.getOrLoadFileByTruncated(reference);
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

        const reference = sentFile.toFileReference().truncate();
        const receivedFile = await recipient.files.getOrLoadFileByTruncated(reference);
        tempId2 = sentFile.id;

        expectValidFiles(sentFile, receivedFile, tempDate);
    });

    test("should send and receive a third File", async function () {
        tempDate = CoreDate.utc().subtract(TestUtil.tempDateThreshold);
        const content = CoreBuffer.fromUtf8("Test3");
        const sentFile = await TestUtil.uploadFile(sender, content);

        const reference = sentFile.toFileReference().truncate();
        const receivedFile = await recipient.files.getOrLoadFileByTruncated(reference);

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
});
