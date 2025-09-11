export interface DeviceDTO {
    id: string;
    isAdmin: boolean;
    publicKey?: string;
    name?: string;
    description?: string;
    createdAt: string;
    createdByDevice: string;
    operatingSystem?: string;
    lastLoginAt?: string;
    type: string;
    username: string;
    isCurrentDevice: boolean;
    isOffboarded?: boolean;
    isBackupDevice: boolean;
}
