export interface BackboneExternalEvent {
    id: string;
    type: string;
    index: number;
    createdAt: string;
    syncErrorCount: number;
    payload: object;
}
