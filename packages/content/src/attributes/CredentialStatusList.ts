import { StatusList } from "@sd-jwt/jwt-status-list";

export enum SupportedStatusListTypes {
    TokenStatusList = "TokenStatusList",
    BitstringStatusList = "BitstringStatusList"
}

export interface TokenStatusListEntryCreationParameters {
    type: SupportedStatusListTypes.TokenStatusList;
    uri: string;
    data?: StatusList;
}

export interface BitstringStatusListEntryCreationParameters {
    type: SupportedStatusListTypes.BitstringStatusList;
    uri: string;
}

export type StatusListEntryCreationParameters = TokenStatusListEntryCreationParameters | BitstringStatusListEntryCreationParameters;
