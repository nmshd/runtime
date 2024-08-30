export type ResponseConfig = AcceptResponseConfigDerivation | RejectResponseConfig;

export interface RejectResponseConfig {
    accept: false;
    code?: string;
    message?: string;
}

export type AcceptResponseConfigDerivation = AcceptResponseConfig | FreeTextAcceptResponseConfig;

export interface AcceptResponseConfig {
    accept: true;
}

export interface FreeTextAcceptResponseConfig extends AcceptResponseConfig {
    freeText: string;
}
