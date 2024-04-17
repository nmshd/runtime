import { RelationshipChangedEvent } from "@nmshd/runtime";
import { AppRuntimeError } from "../../AppRuntimeError";
import { OnboardingChangeReceivedEvent } from "../../events";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule";

export interface RelationshipChangedModuleConfig extends AppRuntimeModuleConfiguration {}

export class RelationshipChangedModuleError extends AppRuntimeError {}

export class RelationshipChangedModule extends AppRuntimeModule<RelationshipChangedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(RelationshipChangedEvent, this.handleRelationshipChanged.bind(this));
    }

    private async handleRelationshipChanged(event: RelationshipChangedEvent) {
        const relationship = event.data;
        // Only listen for the creation change (the first one)
        if (relationship.auditLog?.length !== 1) return;

        const auditLogEntry = relationship.auditLog[0];

        // relationship created by the current identity
        if (auditLogEntry.createdBy === event.eventTargetAddress) return;

        const services = await this.runtime.getServices(event.eventTargetAddress);
        const relationshipDVO = await services.dataViewExpander.expandRelationshipDTO(relationship);
        this.runtime.eventBus.publish(new OnboardingChangeReceivedEvent(event.eventTargetAddress, relationship, relationshipDVO));
    }

    public stop(): void {
        this.unsubscribeFromAllEvents();
    }
}
