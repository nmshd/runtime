export interface BackboneGetAnnouncementsRequest {
    language: string;
}

export interface BackboneGetAnnouncementsResponse {
    id: string;
    createdAt: string;
    expiresAt?: string;
    severity: string;
    title: string;
    body: string;
    iqlQuery?: string | null;
    actions: BackboneGetAnnouncementsActionResponse[];
}

export interface BackboneGetAnnouncementsActionResponse {
    displayName: string;
    link: string;
}
