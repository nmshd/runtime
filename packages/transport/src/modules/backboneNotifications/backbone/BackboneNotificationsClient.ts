import { ClientResult } from "../../../core/backbone/ClientResult.js";
import { RESTClientAuthenticate } from "../../../core/backbone/RESTClientAuthenticate.js";

export class BackboneNotificationsClient extends RESTClientAuthenticate {
    public async sendNotification(input: { recipients: string[]; code: string }): Promise<ClientResult<void>> {
        return await this.post<void>("/api/v2/Notifications", input);
    }
}
