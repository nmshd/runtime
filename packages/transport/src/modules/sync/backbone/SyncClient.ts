import { AbstractAuthenticator } from "../../../core/backbone/Authenticator.js";
import { ClientResult } from "../../../core/backbone/ClientResult.js";
import { ICorrelator, IRESTClientConfig, Paginator, PaginatorPercentageCallback, RESTClientAuthenticate } from "../../../core/index.js";
import { BackboneDatawalletModification } from "./BackboneDatawalletModification.js";
import { BackboneExternalEvent } from "./BackboneExternalEvent.js";
import { CreateDatawalletModificationsRequest, CreateDatawalletModificationsResponse } from "./CreateDatawalletModifications.js";
import {
    FinalizeDatawalletVersionUpgradeRequest,
    FinalizeDatawalletVersionUpgradeResponse,
    FinalizeExternalEventSyncRequest,
    FinalizeExternalEventSyncResponse
} from "./FinalizeSyncRun.js";
import { GetDatawalletResponse } from "./GetDatawallet.js";
import { GetDatawalletModificationsRequest } from "./GetDatawalletModifications.js";
import { StartSyncRunRequest, StartSyncRunResponse } from "./StartSyncRun.js";

export interface ISyncClient {
    startSyncRun(request?: StartSyncRunRequest): Promise<ClientResult<StartSyncRunResponse>>;

    finalizeExternalEventSync(id: string, request: FinalizeExternalEventSyncRequest): Promise<ClientResult<FinalizeExternalEventSyncResponse>>;

    finalizeDatawalletVersionUpgrade(id: string, request: FinalizeDatawalletVersionUpgradeRequest): Promise<ClientResult<FinalizeDatawalletVersionUpgradeResponse>>;

    getExternalEventsOfSyncRun(syncRunId: string, progessCallback?: PaginatorPercentageCallback): Promise<ClientResult<Paginator<BackboneExternalEvent>>>;

    getDatawallet(): Promise<ClientResult<GetDatawalletResponse>>;

    getDatawalletModifications(
        request: GetDatawalletModificationsRequest,
        progessCallback?: PaginatorPercentageCallback
    ): Promise<ClientResult<Paginator<BackboneDatawalletModification>>>;

    createDatawalletModifications(request: CreateDatawalletModificationsRequest): Promise<ClientResult<CreateDatawalletModificationsResponse>>;
}

export class SyncClient extends RESTClientAuthenticate implements ISyncClient {
    public constructor(config: IRESTClientConfig & { supportedDatawalletVersion: number }, authenticator: AbstractAuthenticator, correlator?: ICorrelator) {
        super(config, authenticator, correlator, {
            headers: {
                "x-supported-datawallet-version": config.supportedDatawalletVersion.toString() // eslint-disable-line @typescript-eslint/naming-convention
            }
        });
    }

    public async startSyncRun(request?: StartSyncRunRequest): Promise<ClientResult<StartSyncRunResponse>> {
        return await this.post<StartSyncRunResponse>("/api/v2/SyncRuns", request);
    }

    public async finalizeExternalEventSync(id: string, request: FinalizeExternalEventSyncRequest): Promise<ClientResult<FinalizeExternalEventSyncResponse>> {
        return await this.put<FinalizeExternalEventSyncResponse>(`/api/v2/SyncRuns/${id}/FinalizeExternalEventSync`, request);
    }

    public async finalizeDatawalletVersionUpgrade(id: string, request: FinalizeDatawalletVersionUpgradeRequest): Promise<ClientResult<FinalizeDatawalletVersionUpgradeResponse>> {
        return await this.put<FinalizeDatawalletVersionUpgradeResponse>(`/api/v2/SyncRuns/${id}/FinalizeDatawalletVersionUpgrade`, request);
    }

    public async getExternalEventsOfSyncRun(syncRunId: string, progessCallback?: PaginatorPercentageCallback): Promise<ClientResult<Paginator<BackboneExternalEvent>>> {
        return await this.getPaged<BackboneExternalEvent>(`/api/v2/SyncRuns/${syncRunId}/ExternalEvents`, {}, undefined, progessCallback);
    }

    public async getDatawallet(): Promise<ClientResult<GetDatawalletResponse>> {
        return await this.get<GetDatawalletResponse>("/api/v2/Datawallet");
    }

    public async getDatawalletModifications(
        request: GetDatawalletModificationsRequest,
        progessCallback?: PaginatorPercentageCallback
    ): Promise<ClientResult<Paginator<BackboneDatawalletModification>>> {
        return await this.getPaged<BackboneDatawalletModification>("/api/v2/Datawallet/Modifications", request, undefined, progessCallback);
    }

    public async createDatawalletModifications(request: CreateDatawalletModificationsRequest): Promise<ClientResult<CreateDatawalletModificationsResponse>> {
        return await this.post<CreateDatawalletModificationsResponse>("/api/v2/Datawallet/Modifications", request);
    }
}
