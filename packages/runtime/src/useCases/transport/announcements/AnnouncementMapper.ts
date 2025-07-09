import { AnnouncementDTO } from "@nmshd/runtime-types";
import { Announcement } from "@nmshd/transport";

export class AnnouncementMapper {
    public static toAnnouncementDTO(announcement: Announcement): AnnouncementDTO {
        return {
            id: announcement.id.toString(),
            createdAt: announcement.createdAt.toString(),
            expiresAt: announcement.expiresAt?.toString(),
            severity: announcement.severity,
            title: announcement.title,
            body: announcement.body,
            actions: announcement.actions.map((action) => ({
                displayName: action.displayName,
                link: action.link
            }))
        };
    }
}
