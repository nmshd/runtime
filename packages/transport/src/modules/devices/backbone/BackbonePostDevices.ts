import { IChallengeSignedSerialized } from "../../challenges/data/ChallengeSigned.js";

export interface BackbonePostDevicesRequest {
    devicePassword: string;
    signedChallenge: IChallengeSignedSerialized;
    isBackupDevice?: boolean;
}

export interface BackbonePostDevicesResponse {
    id: string;
    username: string;
    createdAt: string;
    createdByDevice: string;
    isBackupDevice: boolean;
}
