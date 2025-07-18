import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { CoreDate } from "@nmshd/core-types";
import { TestUtil } from "../../testHelpers/TestUtil";

describe("TokenSync", function () {
    let connection: IDatabaseConnection;

    beforeAll(async function () {
        connection = await TestUtil.createDatabaseConnection();
    });

    afterAll(async () => {
        await connection.close();
    });

    test("syncDatawallet should sync tokens", async function () {
        const { device1, device2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        });

        const tokenOnDevice1 = await device1.tokens.sendToken({
            content: { someTokenContent: "someTokenContent" },
            expiresAt: CoreDate.utc().add({ minutes: 5 }),
            ephemeral: false
        });
        await device1.syncDatawallet();

        let tokenOnDevice2 = await device2.tokens.getToken(tokenOnDevice1.id);
        expect(tokenOnDevice2).toBeUndefined();

        await device2.syncDatawallet();

        tokenOnDevice2 = await device2.tokens.getToken(tokenOnDevice1.id);
        expect(tokenOnDevice2).toBeDefined();

        tokenOnDevice2 = await device2.tokens.getToken(tokenOnDevice1.id);
        expect(tokenOnDevice2?.toJSON()).toStrictEqualExcluding(tokenOnDevice1.toJSON(), "cachedAt");
    });
});
