import { ProgressReporter, ProgressReporterStep } from "../../core";

export type SyncProgressCallback = (percentage: number, step: SyncStep) => void;

export class SyncProgressReporter extends ProgressReporter<SyncStep> {
    public static fromCallback(callback?: SyncProgressCallback): SyncProgressReporter {
        return new SyncProgressReporter(callback);
    }
}
export class SyncProgressReporterStep extends ProgressReporterStep<SyncStep> {}

export enum SyncStep {
    Sync = "sync",
    DatawalletSync = "sync:datawallet",
    DatawalletSyncDownloading = "sync:datawallet:downloading",
    DatawalletSyncDecryption = "sync:datawallet:decrypting",
    DatawalletSyncProcessing = "sync:datawallet:processing",
    ExternalEventsSync = "sync:externalEvents",
    ExternalEventsSyncDownloading = "sync:externalEvents:downloading",
    ExternalEventsProcessing = "sync:externalEvents:processing"
}
