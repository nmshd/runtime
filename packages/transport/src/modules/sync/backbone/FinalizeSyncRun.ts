import { CreateDatawalletModificationsRequestItem } from "./CreateDatawalletModifications";

export interface FinalizeExternalEventSyncRequest {
    externalEventResults: FinalizeSyncRunRequestExternalEventResult[];
    datawalletModifications: CreateDatawalletModificationsRequestItem[];
}

export interface FinalizeDatawalletVersionUpgradeRequest {
    newDatawalletVersion: number;
    datawalletModifications?: CreateDatawalletModificationsRequestItem[];
}

export interface FinalizeSyncRunRequestExternalEventResult {
    externalEventId: string;
    errorCode?: string;
}

export interface FinalizeExternalEventSyncResponse {
    newDatawalletModificationIndex: number;
    datawalletModifications: {
        id: string;
        index: number;
        createdAt: string;
    };
}

export interface FinalizeDatawalletVersionUpgradeResponse {
    newDatawalletModificationIndex: number;
    datawalletModifications: {
        id: string;
        index: number;
        createdAt: string;
    }[];
}
