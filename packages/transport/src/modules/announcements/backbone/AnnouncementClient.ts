import { ClientResult, RESTClientAuthenticate } from "../../../core/index.js";
import { BackboneGetAnnouncementsRequest, BackboneGetAnnouncementsResponse } from "./BackboneGetAnnouncements.js";

export class AnnouncementClient extends RESTClientAuthenticate {
    public async getAnnouncements(request: BackboneGetAnnouncementsRequest): Promise<ClientResult<BackboneGetAnnouncementsResponse[]>> {
        return await this.get<BackboneGetAnnouncementsResponse[]>("/api/v2/Announcements", request);
    }
}
