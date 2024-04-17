import { RelationshipStatus } from "@nmshd/runtime";
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
        const identity = event.data.identity;
        let title = "";
        let text = "";
        const session = await this.runtime.getOrCreateSession(event.eventTargetAddress);

        switch (event.data.relationship.status) {
            case RelationshipStatus.Active:
                title = "Kontaktanfrage genehmigt";
                text = `Du kannst nun mit ${identity.name} kommunizieren`;
                break;

            case RelationshipStatus.Pending:
                title = "Kontaktanfrage erhalten";
                text = `Du hast eine Kontaktanfrage von ${identity.name} erhalten`;
                break;

            case RelationshipStatus.Rejected:
                title = "Kontaktanfrage abgelehnt";
                text = `${identity.name} hat ihre Kontaktanfrage abgelehnt`;
                break;

            case RelationshipStatus.Revoked:
                title = "Kontaktanfrage zurückgezogen";
                text = `${identity.name} hat die Kontaktanfrage zurückgezogen`;
                break;

            default:
                return;
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
