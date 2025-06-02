export interface AnnouncementDTO {
    id: string;
    createdAt: string;
    expiresAt?: string;
    severity: AnnouncementSeverity;
    title: string;
    body: string;
    iqlQuery?: string;
}

export enum AnnouncementSeverity {
    Low = "Low",
    Medium = "Medium",
    High = "High"
}
