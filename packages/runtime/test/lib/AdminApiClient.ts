import { LanguageISO639 } from "@nmshd/core-types";
import { AnnouncementSeverity } from "@nmshd/runtime";
import axios, { Axios } from "axios";

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
    actions: { displayName: Partial<Record<keyof typeof LanguageISO639, string>>; link: string }[];
}

export interface CreateAnnouncementResponse {
    id: string;
}
