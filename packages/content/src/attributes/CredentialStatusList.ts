export enum SupportedStatusListTypes {
    TokenStatusList = "TokenStatusList"
}

export interface TokenStatusListEntryCreationParameters {
    type: SupportedStatusListTypes.TokenStatusList;
    uri: string;
}

export type StatusListEntryCreationParameters = TokenStatusListEntryCreationParameters;
