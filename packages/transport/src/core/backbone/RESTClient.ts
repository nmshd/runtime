import { ILogger } from "@js-soft/logging-abstractions";
import { CoreIdHelper } from "@nmshd/core-types";
import { CoreBuffer } from "@nmshd/crypto";
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import formDataLib from "form-data";
import { AgentOptions as HTTPAgentOptions } from "http";
import { AgentOptions as HTTPSAgentOptions } from "https";
import _ from "lodash";
import { ICorrelator } from "../ICorrelator";
import { TransportLoggerFactory } from "../TransportLoggerFactory";
import { ClientResult } from "./ClientResult";
import { IPaginationDataSource, Paginator, PaginatorPercentageCallback } from "./Paginator";
import { PlatformParameters } from "./PlatformParameters";
import { PaginatedPlatformResponse, PlatformResponse } from "./PlatformResponse";
import { RequestError } from "./RequestError";

export class RestPaginationDataSource<T> implements IPaginationDataSource<T> {
    public constructor(
        private readonly client: RESTClient,
        private readonly path: string,
        private readonly args: any
    ) {}

    public async getPage(pageNumber: number): Promise<T[]> {
        this.args.pageNumber = pageNumber;
        return (await this.client.get<T[]>(this.path, this.args)).value;
    }
}

export enum RESTClientLogDirective {
    LogNone,
    LogRequest,
    LogResponse,
    LogAll
}

export interface IRESTClientConfig {
    platformClientId: string;
    platformClientSecret: string;
    platformTimeout: number;
    platformMaxRedirects: number;
    platformAdditionalHeaders?: Record<string, string>;
    httpAgentOptions: HTTPAgentOptions;
    httpsAgentOptions: HTTPSAgentOptions;
    debug: boolean;
    baseUrl: string;
}

export class RESTClient {
    protected _logger: ILogger;
    protected _logDirective = RESTClientLogDirective.LogAll;
    protected axiosInstance: AxiosInstance;

    public logRequest(): boolean {
        return this._logDirective === RESTClientLogDirective.LogRequest || this._logDirective === RESTClientLogDirective.LogAll;
    }

    public logResponse(): boolean {
        return this._logDirective === RESTClientLogDirective.LogResponse || this._logDirective === RESTClientLogDirective.LogAll;
    }

    private async generateRequestId(): Promise<string> {
        const id = await new CoreIdHelper("HTTP").generate();
        return id.toString();
    }

    public constructor(
        protected readonly config: IRESTClientConfig,
        private readonly correlator?: ICorrelator,
        requestConfig: AxiosRequestConfig = {}
    ) {
        const defaults: AxiosRequestConfig = {
            baseURL: config.baseUrl,

            timeout: this.config.platformTimeout,
            maxRedirects: this.config.platformMaxRedirects,
            maxContentLength: Infinity,
            maxBodyLength: Infinity,
            validateStatus: (status) => status < 300 || status === 400 || status === 404 || status === 500,
            paramsSerializer: { dots: true, indexes: null },
            headers: this.config.platformAdditionalHeaders,
            proxy: false
        };

        const resultingRequestConfig = _.defaultsDeep(defaults, requestConfig);

        try {
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const httpAgent = require("http")?.Agent;
            // eslint-disable-next-line @typescript-eslint/no-require-imports
            const httpsAgent = require("https")?.Agent;

            if (httpAgent && httpsAgent) {
                resultingRequestConfig.httpAgent = new httpAgent({ ...this.config.httpAgentOptions, proxyEnv: process.env } satisfies HTTPAgentOptions);
                resultingRequestConfig.httpsAgent = new httpsAgent({ ...this.config.httpsAgentOptions, proxyEnv: process.env } satisfies HTTPSAgentOptions);
            }
        } catch (_) {
            // ignore
        }

        this._logger = TransportLoggerFactory.getLogger(RESTClient);

        this.axiosInstance = axios.create(resultingRequestConfig);

        if (this.correlator) {
            const correlator = this.correlator;
            this.axiosInstance.interceptors.request.use((config) => {
                const correlationId = correlator.getId();
                config.headers["x-correlation-id"] = correlationId;
                return config;
            });
        }

        if (this.config.debug) {
            this.addAxiosLoggingInterceptors(this.axiosInstance);
        }
    }

    private addAxiosLoggingInterceptors(axiosInstance: AxiosInstance) {
        axiosInstance.interceptors.request.use((config) => {
            const requestAsAny = config as any;
            requestAsAny.meta = (config as any).meta ?? {};
            requestAsAny.meta.startTime = new Date().getTime();
            return config;
        });

        axiosInstance.interceptors.response.use((response) => {
            logResponseTime(response);
            return response;
        });

        const logResponseTime = (response: AxiosResponse) => {
            const requestStartTime = (response.config as any).meta.startTime as number;

            // Backbone Call duration
            const backboneResponseDuration = response.headers["x-response-duration-ms"] ? Number.parseInt(response.headers["x-response-duration-ms"]) : undefined;

            const backboneMessage = `${response.config.method!.toUpperCase()} ${
                response.request.path
            } (backbone call): ${backboneResponseDuration ? `${backboneResponseDuration}ms` : "unknown"}`;

            if (backboneResponseDuration && backboneResponseDuration > 200) {
                this._logger.warn(backboneMessage);
            } else {
                this._logger.debug(backboneMessage);
            }

            // Latency duration
            const requestEndTime = new Date().getTime();
            const callAndLatencyMilliseconds = requestEndTime - requestStartTime;
            const latencyMilliseconds = backboneResponseDuration ? callAndLatencyMilliseconds - backboneResponseDuration : undefined;

            const latencyMessage = `${response.config.method!.toUpperCase()} ${response.request.path} (latency): ${latencyMilliseconds}ms`;

            this._logger.debug(latencyMessage);

            // Backbone Call + Latency duration
            this._logger.debug(`${response.config.method!.toUpperCase()} ${response.request.path} (backbone call + latency): ${callAndLatencyMilliseconds}ms`);
        };
    }

    private getResult<T>(method: string, path: string, response: AxiosResponse<PlatformResponse<T> | undefined>, requestId: string): ClientResult<T> {
        const platformParameters = this.extractPlatformParameters(response);

        this._logResponse(response, platformParameters, requestId, method, path);

        // Rare case: We receive status 400 JSON error from Backbone when downloading a file
        if (response.status === 400 && !response.data?.error && response.headers["content-type"] === "application/json; charset=utf-8") {
            try {
                const errorText = CoreBuffer.from(response.data).toUtf8();
                response.data = JSON.parse(errorText);
            } catch (_) {
                // Do nothing here: Error is handled below
            }
        }

        if (response.data?.error) {
            const backboneError = response.data.error;
            const error = new RequestError(method, path, platformParameters, backboneError.code, backboneError.message, backboneError.docs, response.status, backboneError.time, {
                id: backboneError.id,
                details: backboneError.details
            });
            this._logger.debug(error);
            return ClientResult.fail<T>(error, platformParameters);
        }

        if (response.status === 204) {
            return ClientResult.ok<T>({} as T, platformParameters);
        }

        if (response.status === 304) {
            return ClientResult.ok<T>({} as T, platformParameters);
        }

        if (response.status === 404) {
            const error = new RequestError(
                method,
                path,
                platformParameters,
                "error.transport.request.notFound",
                "An http request returned an unspecific 404 (Not Found) error, which is usually the case if the Backbone is not reachable. This could be a temporary problem, or a network, gateway, firewall or configuration issue.",
                "",
                404
            );
            this._logger.debug(error);
            return ClientResult.fail<T>(error, platformParameters);
        }

        if (response.status >= 400 && response.status <= 499) {
            const error = new RequestError(
                method,
                path,
                platformParameters,
                "error.transport.request.badRequest",
                "The platform responded with a Bad Request without giving any specific reason.",
                "",
                response.status
            ).setObject(response.data);
            this._logger.debug(error);
            return ClientResult.fail<T>(error, platformParameters);
        }

        if ((typeof Buffer === "function" && response.data instanceof Buffer) || response.data instanceof ArrayBuffer) {
            // Casting is required for typescript to not complain => data is a buffer
            return ClientResult.ok<T>(response.data as any as T, platformParameters);
        }

        if (!response.data?.result) {
            const error = new RequestError(method, path, platformParameters, "error.transport.request.resultUndefined", "The Platform responded without a result.").setObject(
                response.data
            );
            this._logger.debug(error);
            return ClientResult.fail<T>(error, platformParameters);
        }

        return ClientResult.ok<T>(response.data.result, platformParameters);
    }

    private getPaginator<T>(
        path: string,
        response: AxiosResponse<PaginatedPlatformResponse<T[]> | undefined>,
        requestId: string,
        args: any,
        progessCallback?: PaginatorPercentageCallback
    ): ClientResult<Paginator<T>> {
        const platformParameters = this.extractPlatformParameters(response);

        this._logResponse(response, platformParameters, requestId, "GET", path);

        if (response.data?.error) {
            const backboneError = response.data.error;
            const error = new RequestError("GET", path, platformParameters, backboneError.code, backboneError.message, backboneError.docs, response.status, backboneError.time, {
                id: backboneError.id,
                details: backboneError.details
            });
            this._logger.debug(error);
            return ClientResult.fail<Paginator<T>>(error, platformParameters);
        }

        if (response.status >= 400 && response.status <= 499) {
            const error = new RequestError(
                "GET",
                path,
                platformParameters,
                "error.transport.request.badRequest",
                "The platform responded with a Bad Request without giving any specific reason.",
                "",
                response.status
            ).setObject(response.data);
            this._logger.debug(error);
            return ClientResult.fail<Paginator<T>>(error, platformParameters);
        }

        if (!response.data?.result) {
            const error = new RequestError("GET", path, platformParameters, "error.transport.request.resultUndefined", "The Platform responded without a result.").setObject(
                response.data
            );
            this._logger.debug(error);
            return ClientResult.fail<Paginator<T>>(error, platformParameters);
        }

        response.data.pagination ??= {
            pageNumber: 1,
            pageSize: response.data.result.length,
            totalPages: 1,
            totalRecords: response.data.result.length
        };

        const paginationDataSource = new RestPaginationDataSource<T>(this, path, args);
        const paginator = new Paginator<T>(response.data.result, response.data.pagination, paginationDataSource, progessCallback);

        return ClientResult.ok<Paginator<T>>(paginator, platformParameters);
    }

    public async get<T>(path: string, params: any = {}, config?: AxiosRequestConfig): Promise<ClientResult<T>> {
        const id = await this.generateRequestId();
        const conf = _.defaultsDeep({ params: params }, config);
        if (this.logRequest()) {
            const anyThis = this as any;
            if (anyThis._username) {
                this._logger.trace(`Request ${id} by ${anyThis._username}: GET ${path}`);
            } else {
                this._logger.trace(`Request ${id}: GET ${path}`);
            }
        }

        try {
            const response = await this.axiosInstance.get<PlatformResponse<T>>(path, conf);
            return this.getResult("GET", path, response, id);
        } catch (e: any) {
            const err = RequestError.fromAxiosError("GET", path, e, id);
            this._logger.debug(err);
            return ClientResult.fail<T>(err);
        }
    }

    public async getPaged<T>(path: string, params: any = {}, config?: AxiosRequestConfig, progessCallback?: PaginatorPercentageCallback): Promise<ClientResult<Paginator<T>>> {
        const id = await this.generateRequestId();
        const conf = _.defaultsDeep({ params: params }, config);

        try {
            const response = await this.axiosInstance.get<PlatformResponse<T[]>>(path, conf);
            return this.getPaginator(path, response, id, params, progessCallback);
        } catch (e: any) {
            const err = RequestError.fromAxiosError("GET", path, e, id);
            this._logger.debug(err);
            return ClientResult.fail<Paginator<T>>(err);
        }
    }

    public async post<T>(path: string, data: any, params: any = {}, config?: AxiosRequestConfig): Promise<ClientResult<T>> {
        const id = await this.generateRequestId();
        const conf = _.defaultsDeep({ params: params }, config);

        if (this.logRequest()) {
            const anyThis = this as any;
            if (anyThis._username) {
                this._logger.trace(`Request ${id} by ${anyThis._username}: POST ${path}`, data);
            } else {
                this._logger.trace(`Request ${id}: POST ${path}`, data);
            }
        }

        try {
            const response = await this.axiosInstance.post<PlatformResponse<T>>(path, data, conf);
            return this.getResult("POST", path, response, id);
        } catch (e: any) {
            const err = RequestError.fromAxiosError("POST", path, e, id);
            this._logger.debug(err);
            return ClientResult.fail<T>(err);
        }
    }

    public async postMultipart<T>(path: string, data: any, config?: AxiosRequestConfig): Promise<ClientResult<T>> {
        const id = await this.generateRequestId();
        const formData: any = new formDataLib();

        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                if (key.toLowerCase() === "content") {
                    const value = data[key];

                    const dataToAppend =
                        typeof Buffer !== "undefined"
                            ? // nodejs
                              Buffer.from(value)
                            : // browser
                              new Blob([value]);

                    formData.append(key, dataToAppend, {
                        filename: "cipher.bin"
                    });
                } else {
                    formData.append(key, data[key]);
                }
            }
        }

        const conf = _.defaultsDeep({}, config);
        let sendData = formData;
        if (typeof formData.getHeaders !== "undefined") {
            const h = formData.getHeaders();
            conf["headers"] = conf["headers"] ?? {};
            for (const key in h) {
                conf["headers"][key] = h[key];
            }
            sendData = formData.getBuffer();
        }
        if (this.logRequest()) {
            const anyThis = this as any;
            if (anyThis._username) {
                this._logger.trace(`Request ${id} by ${anyThis._username}: POST-Upload ${path}`);
            } else {
                this._logger.trace(`Request ${id}: POST-Upload ${path}`);
            }
        }

        try {
            const response = await this.axiosInstance.post<PlatformResponse<T>>(path, sendData, conf);
            return this.getResult("POST-Upload", path, response, id);
        } catch (e: any) {
            const err = RequestError.fromAxiosError("POST-Upload", path, e, id);
            this._logger.debug(err);
            return ClientResult.fail<T>(err);
        }
    }

    public async put<T>(path: string, data: any, config?: AxiosRequestConfig): Promise<ClientResult<T>> {
        const id = await this.generateRequestId();
        const conf = _.defaultsDeep({}, config);
        if (this.logRequest()) {
            const anyThis = this as any;
            if (anyThis._username) {
                this._logger.trace(`Request ${id} by ${anyThis._username}: PUT ${path}`, data);
            } else {
                this._logger.trace(`Request ${id}: PUT ${path}`, data);
            }
        }

        try {
            const response = await this.axiosInstance.put<PlatformResponse<T>>(path, data, conf);
            return this.getResult("PUT", path, response, id);
        } catch (e: any) {
            const err = RequestError.fromAxiosError("PUT", path, e, id);
            this._logger.debug(err);
            return ClientResult.fail<T>(err);
        }
    }

    public async patch<T>(path: string, data?: any, config?: AxiosRequestConfig): Promise<ClientResult<T>> {
        const id = await this.generateRequestId();
        const conf = _.defaultsDeep({}, config);
        if (this.logRequest()) {
            const anyThis = this as any;
            if (anyThis._username) {
                this._logger.trace(`Request ${id} by ${anyThis._username}: PATCH ${path}`, data);
            } else {
                this._logger.trace(`Request ${id}: PATCH ${path}`, data);
            }
        }

        try {
            const response = await this.axiosInstance.patch<PlatformResponse<T>>(path, data, conf);
            return this.getResult("PATCH", path, response, id);
        } catch (e: any) {
            const err = RequestError.fromAxiosError("PATCH", path, e, id);
            this._logger.debug(err);
            return ClientResult.fail<T>(err);
        }
    }

    public async delete<T>(path: string, config?: AxiosRequestConfig): Promise<ClientResult<T>> {
        const id = await this.generateRequestId();
        const conf = _.defaultsDeep({}, config);
        if (this.logRequest()) {
            const anyThis = this as any;
            if (anyThis._username) {
                this._logger.trace(`Request ${id} by ${anyThis._username}: DELETE ${path}`);
            } else {
                this._logger.trace(`Request ${id}: DELETE ${path}`);
            }
        }

        try {
            const response = await this.axiosInstance.delete<PlatformResponse<T>>(path, conf);
            return this.getResult("DELETE", path, response, id);
        } catch (e: any) {
            const err = RequestError.fromAxiosError("DELETE", path, e, id);
            this._logger.debug(err);
            return ClientResult.fail<T>(err);
        }
    }

    public async download(path: string, config?: AxiosRequestConfig): Promise<ClientResult<Buffer | ArrayBuffer>> {
        const id = await this.generateRequestId();
        const conf = _.defaultsDeep({}, config);
        conf.responseType = "arraybuffer";
        if (this.logRequest()) {
            const anyThis = this as any;
            if (anyThis._username) {
                this._logger.trace(`Request ${id} by ${anyThis._username}: GET-Download ${path}`);
            } else {
                this._logger.trace(`Request ${id}: GET-Download ${path}`);
            }
        }

        try {
            const response = await this.axiosInstance.get<Buffer | ArrayBuffer>(path, conf);
            const platformParameters = this.extractPlatformParameters(response);

            this._logResponse(response, platformParameters, id, "GET-Download", path);

            return ClientResult.ok(response.data, this.extractPlatformParameters(response));
        } catch (e: any) {
            const err = RequestError.fromAxiosError("GET-Download", path, e, id);
            this._logger.debug(err);
            return ClientResult.fail(err);
        }
    }

    private extractPlatformParameters(response: AxiosResponse): PlatformParameters {
        return {
            requestTime: response.headers["x-request-time"],
            responseDuration: response.headers["x-response-duration-ms"],
            responseTime: response.headers["x-response-time"],
            traceId: response.headers["x-trace-id"],
            correlationId: response.headers["x-correlation-id"],
            responseStatus: response.status,
            etag: response.headers["etag"]
        };
    }

    private _logResponse(response: AxiosResponse, platformParameters: PlatformParameters, requestId: string, method: string, path: string): void {
        if (response.data && this.logResponse()) {
            const message = `Response ${requestId}: ${method} ${path} | TraceId: '${platformParameters.traceId}' | PlatformDuration: ${platformParameters.responseDuration}`;
            try {
                this._logger.trace(message, JSON.stringify(response.data, undefined, 2));
            } catch (_) {
                this._logger.trace(message);
            }
        }
    }
}
