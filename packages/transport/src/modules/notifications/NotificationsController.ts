import { CoreAddress } from "@nmshd/core-types";
import { ControllerName, TransportController } from "../../core/TransportController";
import { AccountController } from "../accounts/AccountController";
import { NotificationsClient } from "./backbone/NotificationsClient";

export class NotificationsController extends TransportController {
    private client: NotificationsClient;

    public constructor(parent: AccountController) {
        super(ControllerName.Notifications, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.client = new NotificationsClient(this.config, this.parent.authenticator, this.transport.correlator);
        return this;
    }

    public async sendNotification(input: { recipients: string[]; code: string }): Promise<void> {
        if (input.recipients.length === 0) {
            throw new Error("At least one recipient is required");
        }

        if (input.code.length === 0) {
            throw new Error("Code must not be empty");
        }

        await this._validateRecipients(input.recipients);

        const result = await this.client.sendNotification(input);

        if (result.isSuccess) return;

        throw new Error(`Failed to send notification: ${result.error.message}`);
    }

    private async _validateRecipients(recipients: string[]): Promise<void> {
        const recipientsWithoutActiveRelationship: string[] = [];

        for (const recipient of recipients) {
            const relationship = await this.parent.relationships.getActiveRelationshipToIdentity(CoreAddress.from(recipient));
            if (!relationship) {
                recipientsWithoutActiveRelationship.push(recipient);
            }
        }

        if (recipientsWithoutActiveRelationship.length === 0) return;

        throw new Error(`No active relationship found for recipients: ${recipientsWithoutActiveRelationship.join(", ")}`);
    }
}
