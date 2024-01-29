import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { sleep } from "@js-soft/ts-utils";
import _ from "lodash";
import { AccountController } from "../../../src";
import { TestUtil } from "../../testHelpers/TestUtil";

interface CallbackObject {
    percentage: number;
    process: string;
}

describe("SyncControllerCallback", function () {
    let connection: IDatabaseConnection;

    let a1: AccountController;
    let b1: AccountController;
    let b2: AccountController;

    beforeAll(async () => {
        connection = await TestUtil.createDatabaseConnection();
        a1 = await TestUtil.createIdentityWithOneDevice(connection, { datawalletEnabled: true });
        ({ device1: b1, device2: b2 } = await TestUtil.createIdentityWithTwoDevices(connection, {
            datawalletEnabled: true
        }));
    });

    afterAll(async function () {
        await a1.close();
        await b1.close();
        await b2.close();

        await connection.close();
    });

    test("should execute the callback during syncEverything", async function () {
        await TestUtil.addRelationship(a1, b1);

        await TestUtil.sendMessage(a1, b1);

        const events: CallbackObject[] = [];

        await sleep(1000);

        await b2.syncEverything((percentage: number, process: string) => {
            events.push({ percentage, process });
        });

        expect(events).toHaveLength(30);

        const grouped = _.groupBy(events, "process");
        for (const key in grouped) {
            const percentages = grouped[key].map((e) => e.percentage);
            expect(percentages).toContain(0);
            expect(percentages).toContain(100);
        }
    });
});
