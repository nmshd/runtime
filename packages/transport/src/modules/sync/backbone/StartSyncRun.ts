import { BackboneSyncRun } from "./BackboneSyncRun";

export interface StartSyncRunResponse {
    status: StartSyncRunStatus;
    syncRun: BackboneSyncRun | null;
}

export interface StartSyncRunRequest {
    type: SyncRunType;
    duration?: number;
}

export enum SyncRunType {
    ExternalEventSync = "ExternalEventSync",
    DatawalletVersionUpgrade = "DatawalletVersionUpgrade"
}

export enum StartSyncRunStatus {
    Created = "Created",
    NoNewEvents = "NoNewEvents"
}
