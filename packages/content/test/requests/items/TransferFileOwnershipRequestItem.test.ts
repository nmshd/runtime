import { CoreId, FileReference } from "@nmshd/core-types";
import { CoreBuffer, CryptoEncryptionAlgorithm, CryptoSecretKey, SodiumWrapper } from "@nmshd/crypto";
import { TransferFileOwnershipRequestItem } from "../../../src";

describe("TransferFileOwnershipRequestItem", () => {
    let fileReference: FileReference;

    beforeAll(async function () {
        await SodiumWrapper.ready();

        fileReference = FileReference.from({
            id: CoreId.from("FILxxxxxxxxxxxxxxxxx"),
            key: CryptoSecretKey.from({
                secretKey: CoreBuffer.from("lerJyX8ydJDEXowq2PMMntRXXA27wgHJYA_BjnFx55Y"),
                algorithm: CryptoEncryptionAlgorithm.XCHACHA20_POLY1305
            })
        });
    });

    test("should serialize the fileReference of the RequestItem to a truncatedFileReference", function () {
        const requestItem = TransferFileOwnershipRequestItem.from({
            mustBeAccepted: true,
            fileReference,
            ownershipToken: "anOwnershipToken"
        });

        const requestItemJson = requestItem.toJSON();
        expect(requestItemJson.fileReference).toBe(fileReference.truncate());
    });

    test("should deserialize the fileReference of the RequestItem to a FileReference", function () {
        const requestItemJson = {
            "@type": "TransferFileOwnershipRequestItemJSON",
            mustBeAccepted: true,
            fileReference: fileReference.truncate(),
            ownershipToken: "anOwnershipToken"
        };

        const requestItem = TransferFileOwnershipRequestItem.from(requestItemJson);
        expect(requestItem.fileReference).toStrictEqual(fileReference);
    });
});
