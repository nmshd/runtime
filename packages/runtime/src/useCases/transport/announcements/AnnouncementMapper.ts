import { Announcement } from "@nmshd/transport";
import { AnnouncementDTO } from "../../../types";

export class AnnouncementMapper {
    public static toAnnouncementDTO(announcement: Announcement): AnnouncementDTO {
        return {
            id: announcement.id.toString(),
            createdAt: announcement.createdAt.toString(),
            expiresAt: announcement.expiresAt?.toString(),
            severity: announcement.severity,
            title: announcement.title,
            body: announcement.body,
            iqlQuery: announcement.iqlQuery
        };
    }
}
