import { IChallengeSignedSerialized } from "../../challenges/data/ChallengeSigned.js";

export interface BackbonePostIdentityRequest {
    identityPublicKey: string;
    devicePassword: string;
    signedChallenge: IChallengeSignedSerialized;
    clientId: string;
    clientSecret: string;
    identityVersion: number;
}

export interface BackbonePostIdentityResponse {
    address: string;
    device: BackboneIdentityDevice;
    createdAt: string;
}

export interface BackboneIdentityDevice {
    id: string;
    username: string;
}
