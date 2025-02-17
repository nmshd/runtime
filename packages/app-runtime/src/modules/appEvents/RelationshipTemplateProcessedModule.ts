import { RelationshipTemplateProcessedEvent, RelationshipTemplateProcessedResult } from "@nmshd/runtime";
import { UserfriendlyApplicationError } from "../../UserfriendlyApplicationError";
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule";

export interface RelationshipTemplateProcessedModuleConfig extends AppRuntimeModuleConfiguration {}

export class RelationshipTemplateProcessedModule extends AppRuntimeModule<RelationshipTemplateProcessedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(RelationshipTemplateProcessedEvent, this.handleRelationshipTemplateProcessed.bind(this));
    }

    private async handleRelationshipTemplateProcessed(event: RelationshipTemplateProcessedEvent) {
        const services = await this.runtime.getServices(event.eventTargetAddress);
        const uiBridge = await this.runtime.uiBridge();

        const account = await this.runtime.accountServices.getAccountByAddress(event.eventTargetAddress);

        const data = event.data;
        switch (data.result) {
            case RelationshipTemplateProcessedResult.ManualRequestDecisionRequired:
            case RelationshipTemplateProcessedResult.NonCompletedRequestExists: {
                const result = await services.consumptionServices.incomingRequests.getRequest({ id: data.requestId });
                if (result.isError) {
                    this.logger.error(result.error);
                    return;
                }

                const request = await services.dataViewExpander.expandLocalRequestDTO(result.value);

                await uiBridge.showRequest(account, request);
                break;
            }

            case RelationshipTemplateProcessedResult.RelationshipExists: {
                const result = await services.transportServices.relationships.getRelationship({
                    id: data.relationshipId
                });

                if (result.isError) {
                    this.logger.error(result.error);
                    return;
                }

                const identityDVO = await services.dataViewExpander.expandRelationshipDTO(result.value);
                await uiBridge.showRelationship(account, identityDVO);
                break;
            }

            case RelationshipTemplateProcessedResult.NoRequest: {
                await uiBridge.showError(
                    new UserfriendlyApplicationError(
                        "error.relationshipTemplateProcessedModule.relationshipTemplateNotSupported",
                        "The relationship template content is not supported."
                    )
                );
                break;
            }

            case RelationshipTemplateProcessedResult.Error: {
                await uiBridge.showError(
                    new UserfriendlyApplicationError(
                        "error.relationshipTemplateProcessedModule.relationshipTemplateProcessingError",
                        "An error occurred while processing the relationship template."
                    )
                );
                break;
            }

            case RelationshipTemplateProcessedResult.RequestAutomaticallyDecided: {
                break;
            }
        }
    }

    public stop(): void {
        this.unsubscribeFromAllEvents();
    }
}
