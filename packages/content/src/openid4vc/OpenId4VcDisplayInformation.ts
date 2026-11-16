/* eslint-disable @typescript-eslint/naming-convention -- Standard OpenID4VC and DCQL field names. */
export interface OpenId4VcDisplayInformation {
    name?: string;
    locale?: string;
    lang?: string;
    description?: string;
    logo?: string | { uri?: string; alt_text?: string };
    backgroundImage?: string | { uri?: string };
    background_image?: string | { uri?: string };
    background_color?: string;
    text_color?: string;
    [key: string]: unknown;
}
