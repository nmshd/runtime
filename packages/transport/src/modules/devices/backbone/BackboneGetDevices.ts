export interface BackboneGetDevicesResponse {
    id: string;
    username: string;
    createdAt: string;
    createdByDevice: string;
    lastLogin: { time: string } | null;
    communicationLanguage: string;
    isBackupDevice: boolean;
}
