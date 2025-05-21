import { MailReceivedEvent } from "../../events";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule";

export interface MailReceivedModuleConfig extends AppRuntimeModuleConfiguration {}

export class MailReceivedModule extends AppRuntimeModule<MailReceivedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(MailReceivedEvent, this.handleMailReceived.bind(this));
    }

    private async handleMailReceived(event: MailReceivedEvent) {
        const session = await this.runtime.getOrCreateSession(event.eventTargetAddress);

        const mail = event.data;
        const sender = mail.createdBy;

        await this.runtime.nativeEnvironment.notificationAccess.schedule(mail.name, mail.createdBy.name, {
            callback: async () => {
                const uiBridge = await this.runtime.uiBridge();
                await uiBridge.showMessage(session.account, sender, mail);
            }
        });
    }
}
