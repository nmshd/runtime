import { CoreDate, CoreIdHelper } from "@nmshd/core-types";
import {
    BackboneDatawalletModification,
    BackboneExternalEvent,
    ClientResult,
    CreateDatawalletModificationsRequest,
    CreateDatawalletModificationsResponse,
    FinalizeDatawalletVersionUpgradeRequest,
    FinalizeDatawalletVersionUpgradeResponse,
    FinalizeExternalEventSyncRequest,
    FinalizeExternalEventSyncResponse,
    GetDatawalletModificationsRequest,
    GetDatawalletResponse,
    ISyncClient,
    Paginator,
    StartSyncRunRequest,
    StartSyncRunResponse,
    StartSyncRunStatus
} from "@nmshd/transport";
import { FakePaginationDataSource } from "./FakePaginationDataSource";

export class FakeSyncClient implements ISyncClient {
    public createDatawalletModificationsRequest?: CreateDatawalletModificationsRequest;
    public getDatawalletModificationsRequest?: GetDatawalletModificationsRequest;
    public finalizeDatawalletVersionUpgradeRequest?: FinalizeDatawalletVersionUpgradeRequest;
    public startSyncRunRequest?: StartSyncRunRequest | undefined;

    public startSyncRun(request?: StartSyncRunRequest): Promise<ClientResult<StartSyncRunResponse>> {
        this.startSyncRunRequest = request;

        return Promise.resolve(
            ClientResult.ok<StartSyncRunResponse>({
                status: StartSyncRunStatus.Created,
                syncRun: {
                    id: "",
                    expiresAt: CoreDate.utc().add({ minutes: 1 }).toISOString(),
                    createdAt: CoreDate.utc().toISOString(),
                    createdBy: "",
                    index: 0,
                    eventCount: 0,
                    createdByDevice: ""
                }
            })
        );
    }

    public finalizeExternalEventSync(_id: string, _request: FinalizeExternalEventSyncRequest): Promise<ClientResult<FinalizeExternalEventSyncResponse>> {
        throw new Error("Method not implemented.");
    }

    public finalizeDatawalletVersionUpgrade(_id: string, request: FinalizeDatawalletVersionUpgradeRequest): Promise<ClientResult<FinalizeDatawalletVersionUpgradeResponse>> {
        this.finalizeDatawalletVersionUpgradeRequest = request;

        return Promise.resolve(
            ClientResult.ok<FinalizeDatawalletVersionUpgradeResponse>({
                newDatawalletModificationIndex: 0,
                datawalletModifications: []
            })
        );
    }

    public getExternalEventsOfSyncRun(_syncRunId: string): Promise<ClientResult<Paginator<BackboneExternalEvent>>> {
        throw new Error("Method not implemented.");
    }

    public getDatawallet(): Promise<ClientResult<GetDatawalletResponse>> {
        return Promise.resolve(
            ClientResult.ok<GetDatawalletResponse>({
                version: 1
            })
        );
    }

    public getDatawalletModifications(request: GetDatawalletModificationsRequest): Promise<ClientResult<Paginator<BackboneDatawalletModification>>> {
        this.getDatawalletModificationsRequest = request;

        return Promise.resolve(
            ClientResult.ok(new Paginator([], { pageNumber: 1, pageSize: 0, totalPages: 0, totalRecords: 0 }, FakePaginationDataSource.empty<BackboneDatawalletModification>()))
        );
    }

    public async createDatawalletModifications(request: CreateDatawalletModificationsRequest): Promise<ClientResult<CreateDatawalletModificationsResponse>> {
        this.createDatawalletModificationsRequest = request;

        const response: CreateDatawalletModificationsResponse = {
            newIndex: request.modifications.length - 1,
            modifications: []
        };

        for (const _ of request.modifications) {
            response.modifications.push({
                id: (await CoreIdHelper.notPrefixed.generate()).serialize(),
                index: response.modifications.length,
                createdAt: CoreDate.utc().toISOString()
            });
        }

        return ClientResult.ok<CreateDatawalletModificationsResponse>(response);
    }
}
