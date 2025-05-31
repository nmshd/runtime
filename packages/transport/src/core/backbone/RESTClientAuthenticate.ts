import { AxiosRequestConfig } from "axios";
import _ from "lodash";
import { ICorrelator } from "../ICorrelator";
import { AbstractAuthenticator } from "./Authenticator";
import { ClientResult } from "./ClientResult";
import { Paginator, PaginatorPercentageCallback } from "./Paginator";
import { RequestError } from "./RequestError";
import { IRESTClientConfig, RESTClient } from "./RESTClient";

export interface CredentialsBasic {
    username: string;
    password: string;
}

export class RESTClientAuthenticate extends RESTClient {
    public constructor(
        config: IRESTClientConfig,
        private readonly authenticator: AbstractAuthenticator,
        correlator?: ICorrelator,
        requestConfig: AxiosRequestConfig = {}
    ) {
        super(config, correlator, requestConfig);
    }

    private async runAuthenticated<T>(restCall: (token: string) => Promise<ClientResult<T>>) {
        const token = await this.authenticator.getToken();
        const result = await restCall(token);
        if (!result.isError) {
            return result;
        }

        if (result.error instanceof RequestError && result.error.status === 401) {
            this._logger.error("401 Authorization Error: ", result.error.message);
            this.authenticator.debugLog(this._logger);

            this.authenticator.clear();
            const token = await this.authenticator.getToken();
            return await restCall(token);
        }

        return ClientResult.fail<T>(result.error);
    }

    public override async get<T>(path: string, params: any = "", config: AxiosRequestConfig = {}): Promise<ClientResult<T>> {
        return await this.runAuthenticated(async (token) => {
            return await super.get<T>(path, params, this.buildAuthenticatedConfig(token, config));
        });
    }

    public override async getPaged<T>(
        path: string,
        params: any = {},
        config: AxiosRequestConfig = {},
        progessCallback?: PaginatorPercentageCallback
    ): Promise<ClientResult<Paginator<T>>> {
        return await this.runAuthenticated(async (token) => {
            return await super.getPaged(path, params, this.buildAuthenticatedConfig(token, config), progessCallback);
        });
    }

    public override async post<T>(path: string, data: any, params: any = {}, config: AxiosRequestConfig = {}): Promise<ClientResult<T>> {
        return await this.runAuthenticated(async (token) => {
            return await super.post<T>(path, data, params, this.buildAuthenticatedConfig(token, config));
        });
    }

    public override async postMultipart<T>(path: string, data: any, config: AxiosRequestConfig = {}): Promise<ClientResult<T>> {
        return await this.runAuthenticated(async (token) => {
            return await super.postMultipart<T>(path, data, this.buildAuthenticatedConfig(token, config));
        });
    }

    public override async put<T>(path: string, data: any, config: AxiosRequestConfig = {}): Promise<ClientResult<T>> {
        return await this.runAuthenticated(async (token) => {
            return await super.put<T>(path, data, this.buildAuthenticatedConfig(token, config));
        });
    }

    public override async patch<T>(path: string, data?: any, config: AxiosRequestConfig = {}): Promise<ClientResult<T>> {
        return await this.runAuthenticated(async (token) => {
            return await super.patch<T>(path, data, this.buildAuthenticatedConfig(token, config));
        });
    }

    public override async delete<T>(path: string, config: AxiosRequestConfig = {}): Promise<ClientResult<T>> {
        return await this.runAuthenticated(async (token) => {
            return await super.delete<T>(path, this.buildAuthenticatedConfig(token, config));
        });
    }

    public override async download(path: string, config: AxiosRequestConfig = {}): Promise<ClientResult<Buffer | ArrayBuffer>> {
        return await this.runAuthenticated(async (token) => {
            return await super.download(path, this.buildAuthenticatedConfig(token, config));
        });
    }

    private buildAuthenticatedConfig(bearerToken: string, config: AxiosRequestConfig) {
        // eslint-disable-next-line @typescript-eslint/naming-convention
        return _.defaultsDeep({ headers: { Authorization: `Bearer ${bearerToken}` } }, config);
    }
}
