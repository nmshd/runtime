import { IdentityDTO } from "./IdentityDTO";

export interface DeviceOnboardingInfoDTO {
    id: string;
    createdAt: string;
    createdByDevice: string;
    name?: string;
    description?: string;
    profileName?: string;
    secretBaseKey: string;
    deviceIndex: number;
    synchronizationKey: string;
    identityPrivateKey?: string;
    identity: IdentityDTO;
    password: string;
    username: string;
    isBackupDevice: boolean;
}
