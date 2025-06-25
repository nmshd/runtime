export interface BackboneGetDevicesResponse {
    id: string;
    username: string;
    createdAt: string;
    createdByDevice: string;
    lastLogin: {
        time: string;
    };
    communicationLanguage: string;
    isBackupDevice: boolean;
}
