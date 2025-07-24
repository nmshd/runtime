import { ClientResult } from "../../../core/backbone/ClientResult";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate";
import { BackbonePostNotificationsRequest } from "./BackbonePostNotifications";

export class NotificationsClient extends RESTClientAuthenticate {
    public async sendNotification(input: BackbonePostNotificationsRequest): Promise<ClientResult<void>> {
        return await this.post<void>("/api/v1/Messages", input);
    }
}
