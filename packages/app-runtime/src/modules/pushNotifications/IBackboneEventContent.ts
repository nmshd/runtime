export enum BackboneEventName {
    DatawalletModificationsCreated = "DatawalletModificationsCreated",
    ExternalEventCreated = "ExternalEventCreated"
}

export interface IBackboneEventContent {
    devicePushIdentifier: string;
    eventName: BackboneEventName;
    sentAt: string;
    payload: any;
}
