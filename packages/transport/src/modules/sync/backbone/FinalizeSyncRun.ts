import { CreateDatawalletModificationsRequestItem } from "./CreateDatawalletModifications.js";

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
    }[];
    newUnsyncedExternalEventsExist: boolean;
}

export interface FinalizeDatawalletVersionUpgradeResponse {
    newDatawalletModificationIndex: number;
    datawalletModifications: {
        id: string;
        index: number;
        createdAt: string;
    }[];
}
