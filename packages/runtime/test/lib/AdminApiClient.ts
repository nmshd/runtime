import { Result } from "@js-soft/ts-utils";
import axios, { Axios } from "axios";
import { AnnouncementSeverity, IdentityDeletionProcessDTO, TransportServices } from "../../src";
import { syncUntilHasIdentityDeletionProcess } from "./testUtils";

let adminClient: Axios | undefined;

export async function getBackboneAdminApiClient(): Promise<Axios> {
    if (adminClient) return adminClient;

    const adminAPIBaseUrl = process.env.NMSHD_TEST_BASEURL_ADMIN_API!;
    if (!adminAPIBaseUrl) throw new Error("Missing environment variable NMSHD_TEST_BASEURL_ADMIN_API");
    const csrf = await axios.get(`${adminAPIBaseUrl}/api/v1/xsrf`, {
        headers: {
            /* eslint-disable-next-line @typescript-eslint/naming-convention */
            "x-api-key": process.env.NMSHD_TEST_ADMIN_API_KEY!
        }
    });
    adminClient = axios.create({
        baseURL: adminAPIBaseUrl,
        headers: {
            /* eslint-disable @typescript-eslint/naming-convention */
            cookie: csrf.headers["set-cookie"],
            "x-xsrf-token": csrf.data,
            "x-api-key": process.env.NMSHD_TEST_ADMIN_API_KEY!
            /* eslint-enable @typescript-eslint/naming-convention */
        }
    });
    return adminClient;
}

export async function startIdentityDeletionProcessFromBackboneAdminApi(transportService: TransportServices, accountAddress: string): Promise<IdentityDeletionProcessDTO> {
    const adminApiClient = await getBackboneAdminApiClient();
    const deletionProcess = await adminApiClient.post<{ result: { id: string } }>(`/api/v1/Identities/${accountAddress}/DeletionProcesses`);

    await syncUntilHasIdentityDeletionProcess(transportService, deletionProcess.data.result.id);

    const activeIdentityDeletionProcess = await transportService.identityDeletionProcesses.getActiveIdentityDeletionProcess();

    return activeIdentityDeletionProcess.value;
}

export async function cancelIdentityDeletionProcessFromBackboneAdminApi(
    transportService: TransportServices,
    accountAddress: string,
    identityDeletionProcessId: string
): Promise<Result<IdentityDeletionProcessDTO>> {
    const adminApiClient = await getBackboneAdminApiClient();
    await adminApiClient.put<void>(`/api/v1/Identities/${accountAddress}/DeletionProcesses/${identityDeletionProcessId}/Cancel`);

    await syncUntilHasIdentityDeletionProcess(transportService, identityDeletionProcessId);

    return await transportService.identityDeletionProcesses.getIdentityDeletionProcess({ id: identityDeletionProcessId });
}

export async function createAnnouncement(request: CreateAnnouncementRequest): Promise<CreateAnnouncementResponse> {
    const adminApiClient = await getBackboneAdminApiClient();
    const response = await adminApiClient.post<{ result: CreateAnnouncementResponse }>(`/api/v1/Announcements`, request);
    if (response.status !== 201) {
        throw new Error(`Failed to create announcement: ${response.statusText}`);
    }
    return response.data.result;
}

export interface CreateAnnouncementRequest {
    severity: AnnouncementSeverity;
    texts: { language: string; title: string; body: string }[];
    isSilent: boolean;
    expiresAt?: string;
    recipients?: string[];
}

export interface CreateAnnouncementResponse {
    id: string;
}
