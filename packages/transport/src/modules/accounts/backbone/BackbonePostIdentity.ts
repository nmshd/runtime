import { IChallengeSignedSerialized } from "../../challenges/data/ChallengeSigned";

export interface BackboneIdentityPostRequest {
    identityPublicKey: string;
    devicePassword: string;
    signedChallenge: IChallengeSignedSerialized;
    clientId: string;
    clientSecret: string;
    identityVersion: number;
}

export interface BackboneIdentityPostResponse {
    address: string;
    device: BackboneIdentityDevice;
    createdAt: string;
}

export interface BackboneIdentityDevice {
    id: string;
    username: string;
}
