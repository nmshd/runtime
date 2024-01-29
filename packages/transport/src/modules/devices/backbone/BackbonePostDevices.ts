import { IChallengeSignedSerialized } from "../../challenges/data/ChallengeSigned";

export interface BackbonePostDevicesRequest {
    devicePassword: string;
    signedChallenge: IChallengeSignedSerialized;
}

export interface BackbonePostDevicesResponse {
    id: string;
    username: string;
    createdAt: string;
    createdByDevice: string;
}
