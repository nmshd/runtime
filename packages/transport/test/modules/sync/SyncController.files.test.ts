import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("FileSync", function () {
    let connection: IDatabaseConnection;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
    });

    afterAll(async () => {
        await connection.close();
    });

    test("syncDatawallet should sync files", async function () {
        const { device1, device2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        });

        const fileOnDevice1 = await device1.files.sendFile({
            description: "A description",
            expiresAt: CoreDate.utc().add({ minutes: 2 }),
            filename: "aFilename.txt",
            mimetype: "text/plain",
            title: "A File Title",
            buffer: CoreBuffer.fromUtf8("Some file content")
        });
        await device1.syncDatawallet();

        let fileOnDevice2 = await device2.files.getFile(fileOnDevice1.id);

        expect(fileOnDevice2, "because the device hasn't synchronized its datawallet yet.").toBeUndefined();

        await device2.syncDatawallet();

        fileOnDevice2 = await device2.files.getFile(fileOnDevice1.id);
        expect(fileOnDevice2).toBeDefined();
        expect(fileOnDevice2?.cache).toBeDefined();
        expect(fileOnDevice2!.toJSON()).toStrictEqualExcluding(fileOnDevice1.toJSON(), "cachedAt");
    });
});
