import { CoreDate } from "@nmshd/core-types";
import fs from "fs";
import { DateTime } from "luxon";
import { FileDTO, GetFilesQuery, OwnerRestriction, TransportServices } from "../../src";
import { exchangeFile, makeUploadRequest, QueryParamConditions, RuntimeServiceProvider, uploadFile } from "../lib";

const serviceProvider = new RuntimeServiceProvider();
let transportServices1: TransportServices;
let transportServices2: TransportServices;

const UNKNOWN_FILE_ID = "FILXXXXXXXXXXXXXXXXX";
const UNKNOWN_TOKEN_ID = "TOKXXXXXXXXXXXXXXXXX";

beforeAll(async () => {
    const runtimeServices = await serviceProvider.launch(2);
    transportServices1 = runtimeServices[0].transport;
    transportServices2 = runtimeServices[1].transport;
}, 30000);
afterAll(async () => await serviceProvider.stop());

describe("File upload", () => {
    test("can upload file", async () => {
        const response = await transportServices1.files.uploadOwnFile(await makeUploadRequest());
        expect(response).toBeSuccessful();
    });

    test("uploaded files can be accessed under /Files", async () => {
        const uploadResponse = await transportServices1.files.uploadOwnFile(await makeUploadRequest());
        expect(uploadResponse).toBeSuccessful();

        const file = uploadResponse.value;
        expect(file).toBeDefined();

        const response = await transportServices1.files.getFiles({ query: { createdAt: file.createdAt } });
        expect(response).toBeSuccessful();
        expect(response.value).toContainEqual(file);
    });

    test("uploaded files can be accessed under /Files/Own", async () => {
        const uploadResponse = await transportServices1.files.uploadOwnFile(await makeUploadRequest());
        expect(uploadResponse).toBeSuccessful();

        const file = uploadResponse.value;
        expect(file).toBeDefined();

        const response = await transportServices1.files.getFiles({ query: { createdAt: file.createdAt }, ownerRestriction: OwnerRestriction.Own });
        expect(response).toBeSuccessful();
        expect(response.value).toContainEqual(file);
    });

    test("uploaded files can be accessed under /Files/{id}", async () => {
        const uploadResponse = await transportServices1.files.uploadOwnFile(await makeUploadRequest());
        expect(uploadResponse).toBeSuccessful();

        const file = uploadResponse.value;
        expect(file).toBeDefined();

        const response = await transportServices1.files.getFile({ id: file.id });
        expect(response).toBeSuccessful();
    });

    test("uploaded files keep their size", async () => {
        const uploadResponse = await transportServices1.files.uploadOwnFile(await makeUploadRequest());
        expect(uploadResponse).toBeSuccessful();

        const file = uploadResponse.value;
        expect(file).toBeDefined();

        const response = await transportServices1.files.downloadFile({ id: file.id });
        expect(response).toBeSuccessful();

        expect(response.value.content.byteLength).toBe(4);
    });

    test("can exchange an empty file", async () => {
        const response = await transportServices1.files.uploadOwnFile(await makeUploadRequest({ content: Buffer.of() }));
        expect(response).toBeSuccessful();

        const downloadResponse = await transportServices1.files.downloadFile({ id: response.value.id });
        expect(downloadResponse).toBeSuccessful();

        expect(downloadResponse.value.content.byteLength).toBe(0);
    });

    test("cannot upload a file that is null", async () => {
        // cannot use client1.files.uploadOwn because it cannot deal with null values
        const response = await transportServices1.files.uploadOwnFile(await makeUploadRequest({ content: null }));

        expect(response).toBeAnError("content must be object", "error.runtime.validation.invalidPropertyValue");
    });

    test("can upload same file twice", async () => {
        const request = await makeUploadRequest({ content: await fs.promises.readFile(`${__dirname}/../__assets__/test.txt`) });

        const response1 = await transportServices1.files.uploadOwnFile(request);
        const response2 = await transportServices1.files.uploadOwnFile(request);
        expect(response1).toBeSuccessful();
        expect(response2).toBeSuccessful();
    });

    test("file description is optional", async () => {
        const response = await transportServices1.files.uploadOwnFile(await makeUploadRequest({ description: "" }));
        expect(response).toBeSuccessful();
    });

    test("uploading a file without expiry date will use the default", async () => {
        const response = await transportServices1.files.uploadOwnFile(await makeUploadRequest({ expiresAt: undefined as unknown as string }));
        expect(response).toBeSuccessful();

        const file = response.value;
        const defaultDate = CoreDate.from("9999-12-31T00:00:00.000Z");
        expect(CoreDate.from(file.expiresAt).isSame(defaultDate)).toBe(true);
    });

    test("can upload a file with tags", async () => {
        const response = await transportServices1.files.uploadOwnFile(await makeUploadRequest({ tags: ["x+%+tag1", "x+%+tag2"] }));
        expect(response).toBeSuccessful();

        expect(response.value.tags).toStrictEqual(["x+%+tag1", "x+%+tag2"]);
    });

    test("cannot upload a file with invalid tags", async () => {
        const response = await transportServices1.files.uploadOwnFile(await makeUploadRequest({ tags: ["x+%+valid-tag", "invalid-tag"] }));
        expect(response).toBeAnError("Detected invalidity of the following tags: 'invalid-tag'.", "error.consumption.attributes.invalidTags");
    });

    test("cannot upload a file with expiry date in the past", async () => {
        const response = await transportServices1.files.uploadOwnFile(await makeUploadRequest({ expiresAt: "1970" }));
        expect(response).toBeAnError("'expiresAt' must be in the future", "error.runtime.validation.invalidPropertyValue");
    });

    test("cannot upload a file with empty expiry date", async () => {
        const response = await transportServices1.files.uploadOwnFile(await makeUploadRequest({ expiresAt: "" }));
        expect(response).toBeAnError("expiresAt must match ISO8601 datetime format", "error.runtime.validation.invalidPropertyValue");
    });
});

describe("Get file", () => {
    let file: FileDTO;
    beforeAll(async () => {
        file = await uploadFile(transportServices1);
    });

    test("can get file by id", async () => {
        const response = await transportServices1.files.getFile({ id: file.id });

        expect(response).toBeSuccessful();
        expect(response.value).toMatchObject(file);
    });

    test("can get file by tags", async () => {
        const uploadFileResult = await transportServices1.files.uploadOwnFile(
            await makeUploadRequest({
                tags: ["aTag", "anotherTag"]
            })
        );
        const file = uploadFileResult.value;

        const uploadFileResult2 = await transportServices1.files.uploadOwnFile(
            await makeUploadRequest({
                tags: ["aThirdTag", "aFourthTag"]
            })
        );
        const file2 = uploadFileResult2.value;

        const getResult = await transportServices1.files.getFiles({ query: { tags: ["aTag"] } });

        expect(getResult).toBeSuccessful();
        expect(getResult.value[0].id).toStrictEqual(file.id);

        const getResult2 = await transportServices1.files.getFiles({ query: { tags: ["aTag", "anotherTag"] } });

        expect(getResult2).toBeSuccessful();
        expect(getResult2.value[0].id).toStrictEqual(file.id);

        const getResult3 = await transportServices1.files.getFiles({ query: { tags: ["aTag", "aThirdTag"] } });

        expect(getResult3).toBeSuccessful();
        const result3Ids = getResult3.value.map((file) => file.id);
        expect(result3Ids).toContain(file.id);
        expect(result3Ids).toContain(file2.id);
    });

    test("accessing not existing file id causes an error", async () => {
        const response = await transportServices1.files.getFile({ id: UNKNOWN_FILE_ID });
        expect(response).toBeAnError("File not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
    });

    test("accessing invalid file id causes an error", async () => {
        const invalidFileId = "NOT_A_FILE_IDXXXXXXX";
        const response = await transportServices1.files.getFile({ id: invalidFileId });
        expect(response).toBeAnError("id must match pattern FIL.*", "error.runtime.validation.invalidPropertyValue");
    });
});

describe("Upload big files", () => {
    test("can not upload a file that is bigger than 10MB", async () => {
        const file = await fs.promises.readFile(`${__dirname}/../__assets__/upload-10+mb.bin`);

        const response = await transportServices1.files.uploadOwnFile(await makeUploadRequest({ content: file }));
        expect(response).toBeAnError("'content' is too large", "error.runtime.validation.invalidPropertyValue");
    });
});

describe("Delete file", () => {
    test("accessing invalid file id causes an error", async () => {
        const response = await transportServices1.files.deleteFile({ fileId: UNKNOWN_FILE_ID });
        expect(response).toBeAnError("File not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
    });

    test("successfully delete file", async () => {
        const uploadResponse = await transportServices1.files.uploadOwnFile(await makeUploadRequest());
        expect(uploadResponse).toBeSuccessful();
        const file = uploadResponse.value;
        expect(file).toBeDefined();

        const deleteFileResponse = await transportServices1.files.deleteFile({ fileId: file.id });
        expect(deleteFileResponse).toBeSuccessful();

        const getFileResponse = await transportServices1.files.getFile({ id: file.id });
        expect(getFileResponse).toBeAnError("File not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
    });
});

describe("Files query", () => {
    test("files can be queried by their attributes", async () => {
        const file = await uploadFile(transportServices1);
        const conditions = new QueryParamConditions<GetFilesQuery>(file, transportServices1)
            .addDateSet("createdAt")
            .addDateSet("createdBy")
            .addDateSet("createdByDevice")
            .addStringSet("description")
            .addDateSet("expiresAt")
            .addStringSet("filename")
            .addNumberSet("filesize")
            .addStringSet("mimetype")
            .addStringSet("title")
            .addBooleanSet("isOwn");

        await conditions.executeTests((c, q) => c.files.getFiles({ query: q }));
    });

    test("own files can be queried by their attributes", async () => {
        const file = await uploadFile(transportServices1);
        const conditions = new QueryParamConditions<GetFilesQuery>(file, transportServices1)
            .addDateSet("createdAt")
            .addDateSet("createdBy")
            .addDateSet("createdByDevice")
            .addStringSet("description")
            .addDateSet("expiresAt")
            .addStringSet("filename")
            .addNumberSet("filesize")
            .addStringSet("mimetype")
            .addStringSet("title");

        await conditions.executeTests((c, q) => c.files.getFiles({ query: q, ownerRestriction: OwnerRestriction.Own }));
    });

    test("peer files can be queried by their attributes", async () => {
        const file = await exchangeFile(transportServices1, transportServices2);
        const conditions = new QueryParamConditions<GetFilesQuery>(file, transportServices2)
            .addDateSet("createdAt")
            .addDateSet("createdBy")
            .addDateSet("createdByDevice")
            .addStringSet("description")
            .addDateSet("expiresAt")
            .addStringSet("filename")
            .addNumberSet("filesize")
            .addStringSet("mimetype")
            .addStringSet("title");

        await conditions.executeTests((c, q) => c.files.getFiles({ query: q, ownerRestriction: OwnerRestriction.Peer }));
    });
});

describe("Can create token for file", () => {
    let file: FileDTO;

    beforeAll(async () => {
        file = await uploadFile(transportServices1);
    });

    test("can generate token for uploaded file", async () => {
        const response = await transportServices1.files.createTokenForFile({ fileId: file.id });
        expect(response).toBeSuccessful();
    });

    test("can generate token for uploaded file with explicit expiration date", async () => {
        const expiresAt = DateTime.now().plus({ minutes: 5 }).toString();
        const response = await transportServices1.files.createTokenForFile({ fileId: file.id, expiresAt });

        expect(response).toBeSuccessful();
    });

    test("cannot generate token for uploaded file with wrong expiration date", async () => {
        const response = await transportServices1.files.createTokenForFile({ fileId: file.id, expiresAt: "invalid date" });

        expect(response).toBeAnError("expiresAt must match ISO8601 datetime format", "error.runtime.validation.invalidPropertyValue");
    });

    test("cannot generate token with wrong type of id", async () => {
        const response = await transportServices1.files.createTokenForFile({ fileId: UNKNOWN_TOKEN_ID });

        expect(response).toBeAnError("fileId must match pattern FIL.*", "error.runtime.validation.invalidPropertyValue");
    });

    test("cannot generate token for non-existant file", async () => {
        const response = await transportServices1.files.createTokenForFile({ fileId: UNKNOWN_FILE_ID });

        expect(response).toBeAnError("File not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
    });

    test("cannot generate token for invalid file id", async () => {
        const response = await transportServices1.files.createTokenForFile({ fileId: "INVALID FILE ID" });

        expect(response).toBeAnError("fileId must match pattern FIL.*", "error.runtime.validation.invalidPropertyValue");
    });
});

describe("Load peer file with token reference", () => {
    let file: FileDTO;

    beforeAll(async () => {
        file = await uploadFile(transportServices1);
    });

    test("before the peer file is loaded another client cannot access it", async () => {
        expect(file).toBeDefined();

        const response = await transportServices2.files.getFile({ id: file.id });
        expect(response).toBeAnError("File not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
    });

    test("peer file can be loaded with truncated token reference", async () => {
        expect(file).toBeDefined();

        const token = (await transportServices1.files.createTokenForFile({ fileId: file.id })).value;
        const response = await transportServices2.files.getOrLoadFile({ reference: token.truncatedReference });

        expect(response).toBeSuccessful();
        expect(response.value).toMatchObject({ ...file, isOwn: false });
    });

    test("after peer file is loaded the file can be accessed under /Files/{id}", async () => {
        expect(file).toBeDefined();

        const response = await transportServices2.files.getFile({ id: file.id });
        expect(response).toBeSuccessful();
        expect(response.value).toMatchObject({ ...file, isOwn: false });
    });

    test("after peer file is loaded it can be accessed under /Files", async () => {
        expect(file).toBeDefined();

        const response = await transportServices2.files.getFiles({ query: { createdAt: file.createdAt } });
        expect(response).toBeSuccessful();
        expect(response.value).toContainEqual({ ...file, isOwn: false });
    });

    test("should load a peer file with its tags", async () => {
        const uploadOwnFileResult = await transportServices1.files.uploadOwnFile(
            await makeUploadRequest({
                tags: ["tag1", "tag2"]
            })
        );
        const token = (await transportServices1.files.createTokenForFile({ fileId: uploadOwnFileResult.value.id })).value;
        const loadFileResult = await transportServices2.files.getOrLoadFile({ reference: token.truncatedReference });

        expect(loadFileResult.value.tags).toStrictEqual(["tag1", "tag2"]);
    });

    test("cannot pass token id as truncated token reference", async () => {
        const file = await uploadFile(transportServices1);
        const token = (await transportServices1.files.createTokenForFile({ fileId: file.id })).value;

        const response = await transportServices2.files.getOrLoadFile({ reference: token.id });
        expect(response).toBeAnError("token / file reference invalid", "error.runtime.validation.invalidPropertyValue");
    });

    test("passing file id as truncated token reference causes an error", async () => {
        const file = await uploadFile(transportServices1);

        const response = await transportServices2.files.getOrLoadFile({ reference: file.id });
        expect(response).toBeAnError("token / file reference invalid", "error.runtime.validation.invalidPropertyValue");
    });

    test.each([
        [null, "token / file reference invalid"],
        [undefined, "token / file reference invalid"],
        ["", "token / file reference invalid"]
    ])("passing %p as truncated token reference causes an error", async (tokenReference, expectedMessage) => {
        const response = await transportServices2.files.getOrLoadFile({ reference: tokenReference! });
        expect(response).toBeAnError(expectedMessage, "error.runtime.validation.invalidPropertyValue");
    });

    test("passing empty object causes an error", async () => {
        const response = await transportServices2.files.getOrLoadFile({} as any);
        expect(response).toBeAnError("token / file reference invalid", "error.runtime.validation.invalidPropertyValue");
    });
});

describe("Load peer file with the FileReference", () => {
    let file: FileDTO;

    beforeAll(async () => {
        file = await uploadFile(transportServices1);
    });

    test("before the peer file is loaded another client cannot access it", async () => {
        expect(file).toBeDefined();

        const response = await transportServices2.files.getFile({ id: file.id });
        expect(response).toBeAnError("File not found. Make sure the ID exists and the record is not expired.", "error.runtime.recordNotFound");
    });

    test("load the file using the FileReference", async () => {
        const fileResult = await transportServices2.files.getOrLoadFile({ reference: file.truncatedReference });
        expect(fileResult).toBeSuccessful();
    });

    test("after peer file is loaded the file can be accessed under /Files/{id}", async () => {
        expect(file).toBeDefined();

        const response = await transportServices2.files.getFile({ id: file.id });
        expect(response).toBeSuccessful();
        expect(response.value).toMatchObject({ ...file, isOwn: false });
    });

    test("after peer file is loaded it can be accessed under /Files", async () => {
        expect(file).toBeDefined();

        const response = await transportServices2.files.getFiles({ query: { createdAt: file.createdAt } });
        expect(response).toBeSuccessful();
        expect(response.value).toContainEqual({ ...file, isOwn: false });
    });
});
