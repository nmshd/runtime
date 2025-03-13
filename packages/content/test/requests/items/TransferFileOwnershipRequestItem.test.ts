import { CoreId } from "@nmshd/core-types";
import { CoreBuffer, CryptoEncryptionAlgorithm, CryptoSecretKey } from "@nmshd/crypto";
import { FileReference } from "@nmshd/transport";
import { TransferFileOwnershipRequestItem } from "../../../src";
import { createConnection, createTransport } from "../../testUtils";

describe("TransferFileOwnershipRequestItem", () => {
    let fileReference: FileReference;

    beforeAll(async function () {
        const connection = await createConnection();
        const transport = createTransport(connection);
        await transport.init();

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
            fileReference: fileReference
        });

        const requestItemJson = requestItem.toJSON();
        expect(requestItemJson.fileReference).toBe(fileReference.truncate());
    });

    test("should deserialize the fileReference of the RequestItem to a FileReference", function () {
        const requestItemJson = {
            "@type": "TransferFileOwnershipRequestItemJSON",
            mustBeAccepted: true,
            fileReference: fileReference.truncate()
        };

        const requestItem = TransferFileOwnershipRequestItem.from(requestItemJson);
        expect(requestItem.fileReference).toStrictEqual(fileReference);
    });
});
