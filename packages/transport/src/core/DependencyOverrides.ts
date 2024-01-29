import { ISyncClient } from "../modules/sync/backbone/SyncClient";

export interface DependencyOverrides {
    syncClient?: ISyncClient;
}
