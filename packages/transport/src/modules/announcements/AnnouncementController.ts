import { LanguageISO639 } from "@nmshd/core-types";
import { ControllerName, TransportController } from "../../core/index.js";
import { AccountController } from "../accounts/AccountController.js";
import { AnnouncementClient } from "./backbone/AnnouncementClient.js";
import { Announcement } from "./data/Announcement.js";

export class AnnouncementController extends TransportController {
    private client: AnnouncementClient;
    public constructor(parent: AccountController) {
        super(ControllerName.Message, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.client = new AnnouncementClient(this.config, this.parent.authenticator, this.transport.correlator);
        return this;
    }

    public async getAnnouncements(language: LanguageISO639): Promise<Announcement[]> {
        const response = await this.client.getAnnouncements({ language });

        const announcements = response.value.map((value) =>
            Announcement.fromAny({
                ...value,
                iqlQuery: value.iqlQuery ?? undefined
            })
        );

        return announcements;
    }
}
