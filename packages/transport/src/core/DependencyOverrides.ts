import { ISyncClient } from "../modules/sync/backbone/SyncClient.js";

export interface DependencyOverrides {
    syncClient?: ISyncClient;
}
