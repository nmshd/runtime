import { CoreAddress } from "@nmshd/core-types";
import { TransportCoreErrors } from "../../core/index.js";
import { ControllerName, TransportController } from "../../core/TransportController.js";
import { AccountController } from "../accounts/AccountController.js";
import { BackboneNotificationsClient } from "./backbone/BackboneNotificationsClient.js";

export class BackboneNotificationsController extends TransportController {
    private client: BackboneNotificationsClient;

    public constructor(parent: AccountController) {
        super(ControllerName.BackboneNotifications, parent);
    }

    public override async init(): Promise<this> {
        await super.init();

        this.client = new BackboneNotificationsClient(this.config, this.parent.authenticator, this.transport.correlator);
        return this;
    }

    public async sendNotification(input: { recipients: string[]; code: string }): Promise<void> {
        if (input.recipients.length === 0) throw TransportCoreErrors.backboneNotifications.atLeastOneRecipientRequired();
        if (input.code.length === 0) throw TransportCoreErrors.backboneNotifications.codeMustNotBeEmpty();

        await this._validateRecipients(input.recipients);

        const result = await this.client.sendNotification(input);

        if (result.isSuccess) return;

        throw result.error;
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

        throw TransportCoreErrors.backboneNotifications.noActiveRelationshipFoundForRecipients(recipientsWithoutActiveRelationship);
    }
}
