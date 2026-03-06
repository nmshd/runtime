export interface AnnouncementDTO {
    id: string;
    createdAt: string;
    expiresAt?: string;
    severity: AnnouncementSeverity;
    title: string;
    body: string;
    actions: AnnouncementActionDTO[];
}

export enum AnnouncementSeverity {
    Low = "Low",
    Medium = "Medium",
    High = "High"
}

export interface AnnouncementActionDTO {
    displayName: string;
    link: string;
}
