import { RelationshipAuditLogEntryReason } from "@nmshd/runtime";
import { OnboardingChangeReceivedEvent } from "../../events";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule";

export interface OnboardingChangeReceivedModuleConfig extends AppRuntimeModuleConfiguration {}

export class OnboardingChangeReceivedModule extends AppRuntimeModule<OnboardingChangeReceivedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(OnboardingChangeReceivedEvent, this.handleOnboardingChangeReceived.bind(this));
    }

    private async handleOnboardingChangeReceived(event: OnboardingChangeReceivedEvent) {
        const auditLogEntry = event.data.auditLogEntry;
        const identity = event.data.identity;
        let title = "";
        let text = "";
        const session = await this.runtime.getOrCreateSession(event.eventTargetAddress);

        switch (auditLogEntry.reason) {
            case RelationshipAuditLogEntryReason.AcceptanceOfCreation:
                title = "Kontaktanfrage genehmigt";
                text = `Du kannst nun mit ${identity.name} kommunizieren`;
                break;

            case RelationshipAuditLogEntryReason.Creation:
                title = "Kontaktanfrage erhalten";
                text = `Du hast eine Kontaktanfrage von ${identity.name} erhalten`;
                break;

            case RelationshipAuditLogEntryReason.RejectionOfCreation:
                title = "Kontaktanfrage abgelehnt";
                text = `${identity.name} hat ihre Kontaktanfrage abgelehnt`;
                break;

            case RelationshipAuditLogEntryReason.RevocationOfCreation:
                title = "Kontaktanfrage zurückgezogen";
                text = `${identity.name} hat die Kontaktanfrage zurückgezogen`;
                break;

            default:
                return;
        }
        await this.runtime.notificationAccess.schedule(title, text, {
            callback: async () => {
                const uiBridge = await this.runtime.uiBridge();
                await uiBridge.showRelationship(session.account, identity);
            }
        });
    }
}
