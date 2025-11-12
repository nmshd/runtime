import { RelationshipAuditLogEntryReason, RelationshipChangedEvent } from "@nmshd/runtime";
import { OnboardingChangeReceivedEvent } from "../../events/index.js";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule.js";

export interface RelationshipChangedModuleConfig extends AppRuntimeModuleConfiguration {}

export class RelationshipChangedModule extends AppRuntimeModule<RelationshipChangedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(RelationshipChangedEvent, this.handleRelationshipChanged.bind(this));
    }

    private async handleRelationshipChanged(event: RelationshipChangedEvent) {
        const relationship = event.data;

        const lastAuditLogEntry = relationship.auditLog[relationship.auditLog.length - 1];

        // Do not process changes that were created by the current user
        if (lastAuditLogEntry.createdBy === event.eventTargetAddress) return;

        switch (lastAuditLogEntry.reason) {
            case RelationshipAuditLogEntryReason.Creation:
            case RelationshipAuditLogEntryReason.AcceptanceOfCreation:
            case RelationshipAuditLogEntryReason.RevocationOfCreation:
            case RelationshipAuditLogEntryReason.RejectionOfCreation:
                break;

            default:
                return;
        }

        const services = await this.runtime.getServices(event.eventTargetAddress);
        const relationshipDVO = await services.dataViewExpander.expandRelationshipDTO(relationship);

        const eventToPublish = new OnboardingChangeReceivedEvent(event.eventTargetAddress, relationship, lastAuditLogEntry, relationshipDVO);
        this.runtime.eventBus.publish(eventToPublish);
    }
}
