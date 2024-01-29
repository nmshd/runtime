export enum BackboneEventName {
    DatawalletModificationsCreated = "DatawalletModificationsCreated",
    ExternalEventCreated = "ExternalEventCreated"
}

export interface IBackboneEventContent {
    accRef: string;
    eventName: BackboneEventName;
    sentAt: string;
    payload: any;
}
