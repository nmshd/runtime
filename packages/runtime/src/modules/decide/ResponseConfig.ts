export type ResponseConfig = AcceptResponseConfig | RejectResponseConfig;

export interface RejectResponseConfig {
    accept: false;
    code?: string;
    message?: string;
}

export interface AcceptResponseConfig {
    accept: true;
}

export interface FreeTextAcceptResponseConfig extends AcceptResponseConfig {
    freeText: string;
}
