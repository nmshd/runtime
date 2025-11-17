import { CoreDate } from "@nmshd/core-types";
import { AxiosResponse } from "axios";
import qs from "qs";
import { ClientResult } from "./ClientResult.js";
import { PlatformParameters } from "./PlatformParameters.js";
import { RequestError } from "./RequestError.js";
import { RESTClient } from "./RESTClient.js";

export interface IAuthenticationRequest {
    grantType: string;
    clientId: string;
    clientSecret: string;
    username: string;
    password: string;
}

export interface IAuthenticationResponse {
    expiry: CoreDate;
    token: string;
}

export class AuthClient extends RESTClient {
    public async authenticate(params: IAuthenticationRequest): Promise<ClientResult<IAuthenticationResponse>> {
        const path = "/connect/token";

        let response;
        try {
            response = await this.axiosInstance.post<string, AxiosResponse<any>>(
                path,
                qs.stringify({
                    client_id: params.clientId, // eslint-disable-line @typescript-eslint/naming-convention
                    client_secret: params.clientSecret, // eslint-disable-line @typescript-eslint/naming-convention
                    grant_type: params.grantType, // eslint-disable-line @typescript-eslint/naming-convention
                    username: params.username,
                    password: params.password
                })
            );
        } catch (e: any) {
            const error = new RequestError(
                "post",
                path,
                undefined,
                "error.transport.request.noAuthPossible",
                `Authentication was not possible. Is the service up and running?${e.message ? ` Root cause: '${e.message}'` : ""}`,
                "",
                e.response?.status
            ).setObject(e.isAxiosError ? RequestError.cleanAxiosError(e) : e);

            return ClientResult.fail(error);
        }

        const platformParameters: PlatformParameters = {
            requestTime: response.headers["x-request-time"],
            responseDuration: response.headers["x-response-duration-ms"],
            responseTime: response.headers["x-response-time"],
            traceId: response.headers["x-trace-id"]
        };

        if (response.status !== 200) {
            return ClientResult.fail(
                new RequestError(
                    "post",
                    path,
                    platformParameters,
                    "error.transport.request.noAuthGrant",
                    "Backbone did not grant authentication. Are the credentials correct?",
                    "",
                    response.status
                ).setObject(response.data.error)
            );
        }

        const responseData: any = response.data;

        return ClientResult.ok({
            expiry: CoreDate.utc().add({ seconds: parseInt(responseData.expires_in) }),
            token: responseData.access_token
        });
    }
}
