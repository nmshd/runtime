/**
 * Simplified projection of an identity attribute, retaining only
 * those field required for the execution of IQL queries.
 *
 * TODO: Reuse existing interfaces from libcontent; DRY
 */
export interface AttributeView {
    value: {
        "@type": string;
        [_: string]: unknown;
    };
    tags?: string[];
    [_: string]: unknown;
}
/**
 * Executes IQL query, returning array of indicies of matched attributes in
 * attribute array.
 */
export declare function execute(iqlQuery: string, attributes: AttributeView[]): number[];
export interface IValidateSuccess {
    isValid: true;
}
export interface IValidateError {
    isValid: false;
    error: {
        message: string;
        location: {
            start: {
                column: number;
                line: number;
                offset: number;
            };
            end: {
                column: number;
                line: number;
                offset: number;
            };
        };
    };
}
export type IValidateResult = IValidateSuccess | IValidateError;
export declare function validate(iqlQuery: string): IValidateResult;
