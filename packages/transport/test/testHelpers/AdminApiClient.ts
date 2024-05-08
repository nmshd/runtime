import axios, { Axios } from "axios";
import { AccountController, CoreId, IdentityDeletionProcess, IdentityDeletionProcessStatus } from "../../src";
import { TestUtil } from "./TestUtil";

export class AdminApiClient {
    private static adminClient: Axios | undefined;

    public static async getBackboneAdminApiClient(): Promise<Axios> {
        if (AdminApiClient.adminClient) {
            return AdminApiClient.adminClient;
        }
        const adminAPIBaseUrl = process.env.NMSHD_TEST_BASEURL_ADMIN_API;
        if (!adminAPIBaseUrl) throw new Error("Missing environment variable NMSHD_TEST_BASEURL_ADMIN_API");
        const csrf = await axios.get(`${adminAPIBaseUrl}/api/v1/xsrf`);
        AdminApiClient.adminClient = axios.create({
            baseURL: adminAPIBaseUrl,
            headers: {
                /* eslint-disable @typescript-eslint/naming-convention */
                cookie: csrf.headers["set-cookie"],
                "x-xsrf-token": csrf.data,
                "x-api-key": process.env.NMSHD_TEST_ADMIN_API_KEY!
                /* eslint-enable @typescript-eslint/naming-convention */
            }
        });
        return AdminApiClient.adminClient;
    }

    public static async startIdentityDeletionProcessFromBackboneAdminApi(account: AccountController): Promise<IdentityDeletionProcess> {
        const adminApiClient = await AdminApiClient.getBackboneAdminApiClient();
        const deletionProcess = await adminApiClient.post<{ result: { id: string } }>(`/api/v1/Identities/${account.identity.address.toString()}/DeletionProcesses`);
        await TestUtil.syncUntilHasIdentityDeletionProcess(account, CoreId.from(deletionProcess.data.result.id));

        const activeIdentityDeletionProcess = await account.identityDeletionProcess.getIdentityDeletionProcessByStatus(IdentityDeletionProcessStatus.WaitingForApproval);
        if (typeof activeIdentityDeletionProcess === "undefined") {
            throw new Error("IdentityDeletionProcess not found.");
        }

        return activeIdentityDeletionProcess;
    }

    public static async cancelIdentityDeletionProcessFromBackboneAdminApi(account: AccountController, identityDeletionProcessId: CoreId): Promise<IdentityDeletionProcess> {
        const adminApiClient = await AdminApiClient.getBackboneAdminApiClient();
        await adminApiClient.put<void>(`/api/v1/Identities/${account.identity.address.toString()}/DeletionProcesses/${identityDeletionProcessId}/Cancel`);

        await TestUtil.syncUntilHasIdentityDeletionProcess(account, identityDeletionProcessId);

        return (await account.identityDeletionProcess.getIdentityDeletionProcess(identityDeletionProcessId.toString()))!;
    }
}
