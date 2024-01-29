import { RESTClient, RESTClientLogDirective } from "../../../core";
import { ClientResult } from "../../../core/backbone/ClientResult";
import { IChallengeSignedSerialized } from "../../challenges/data/ChallengeSigned";

export interface PlatformIdentityPostRequest {
    identityPublicKey: string;
    devicePassword: string;
    signedChallenge: IChallengeSignedSerialized;
    clientId: string;
    clientSecret: string;
    identityVersion: number;
}

export interface PlatformIdentityDevice {
    id: string;
    username: string;
}

export interface PlatformIdentityPostResponse {
    address: string;
    device: PlatformIdentityDevice;
    createdAt: string;
}

export class IdentityClient extends RESTClient {
    protected override _logDirective = RESTClientLogDirective.LogResponse;

    public async createIdentity(value: PlatformIdentityPostRequest): Promise<ClientResult<PlatformIdentityPostResponse>> {
        return await this.post<PlatformIdentityPostResponse>("/api/v1/Identities", value, {});
    }
}
