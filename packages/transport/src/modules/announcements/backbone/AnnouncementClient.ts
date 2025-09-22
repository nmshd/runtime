import { ClientResult, RESTClientAuthenticate } from "../../../core";
import { BackboneGetAnnouncementsRequest, BackboneGetAnnouncementsResponse } from "./BackboneGetAnnouncements";

export class AnnouncementClient extends RESTClientAuthenticate {
    public async getAnnouncements(request: BackboneGetAnnouncementsRequest): Promise<ClientResult<BackboneGetAnnouncementsResponse[]>> {
        return await this.get<BackboneGetAnnouncementsResponse[]>("/api/v2/Announcements", request);
    }
}
