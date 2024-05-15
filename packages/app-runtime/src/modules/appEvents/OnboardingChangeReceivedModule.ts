import { RelationshipChangeStatus } from "@nmshd/runtime";
import { AppRuntimeError } from "../../AppRuntimeError";
import { OnboardingChangeReceivedEvent } from "../../events";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule";

export interface OnboardingChangeReceivedModuleConfig extends AppRuntimeModuleConfiguration {}

export class OnboardingChangeReceivedModuleError extends AppRuntimeError {}

export class OnboardingChangeReceivedModule extends AppRuntimeModule<OnboardingChangeReceivedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(OnboardingChangeReceivedEvent, this.handleOnboardingChangeReceived.bind(this));
    }

    private async handleOnboardingChangeReceived(event: OnboardingChangeReceivedEvent) {
        const change = event.data.change;
        const identity = event.data.identity;
        let title = "";
        let text = "";
        const session = await this.runtime.getOrCreateSession(event.eventTargetAddress);

        switch (change.status) {
            case RelationshipChangeStatus.Accepted:
                title = "Kontaktanfrage genehmigt";
                text = `Du kannst nun mit ${identity.name} kommunizieren`;
                break;

            case RelationshipChangeStatus.Pending:
                title = "Kontaktanfrage erhalten";
                text = `Du hast eine Kontaktanfrage von ${identity.name} erhalten`;
                break;

            case RelationshipChangeStatus.Rejected:
                title = "Kontaktanfrage abgelehnt";
                text = `${identity.name} hat ihre Kontaktanfrage abgelehnt`;
                break;

            case RelationshipChangeStatus.Revoked:
                title = "Kontaktanfrage zurückgezogen";
                text = `${identity.name} hat die Kontaktanfrage zurückgezogen`;
                break;
        }
        await this.runtime.nativeEnvironment.notificationAccess.schedule(title, text, {
            callback: async () => {
                const uiBridge = await this.runtime.uiBridge();
                await uiBridge.showRelationship(session.account, identity);
            }
        });
    }

    public stop(): void {
        this.unsubscribeFromAllEvents();
    }
}
