export enum SupportedStatusListTypes {
    TokenStatusList = "TokenStatusList",
    BitstringStatusList = "BitstringStatusList"
}

export interface TokenStatusListEntryCreationParameters {
    type: SupportedStatusListTypes.TokenStatusList;
    uri: string;
}

export interface BitstringStatusListEntryCreationParameters {
    type: SupportedStatusListTypes.BitstringStatusList;
    uri: string;
}

export type StatusListEntryCreationParameters = TokenStatusListEntryCreationParameters | BitstringStatusListEntryCreationParameters;
