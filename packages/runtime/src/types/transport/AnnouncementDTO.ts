export interface AnnouncementDTO {
    id: string,
    createdAt: string,
    expiresAt?: string,
    severity: AnnouncementSeverity,
    title: string,
    body: string
}

export enum AnnouncementSeverity {
    Low = "Low",
    Medium = "Medium",
    High = "High"
}
