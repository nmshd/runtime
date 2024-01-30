import { parse, SyntaxError } from "./iql.gen.js";

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
export function execute(iqlQuery: string, attributes: AttributeView[]): number[] {
    return parse(iqlQuery, { attributes }) as number[];
}

export interface IValidateSuccess {
    isValid: true;
}

export interface IValidateError {
    isValid: false;
    error: {
        message: string;

        /* Location of syntax error in the input string. */
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

export function validate(iqlQuery: string): IValidateResult {
    try {
        parse(iqlQuery, { attributes: [] });
        return { isValid: true };
    } catch (error: any) {
        // FIXME: Is there a cleaner way to catch IQL SyntaxErrors?
        //        For the sake of backwards compatibility peggy compiles to old
        //        js without the use of classes. Thus the static type inference
        //        for the SyntaxError type is severely crippled.
        if (error instanceof SyntaxError) {
            const err = error as any; // see FIXME above.
            return {
                isValid: false,
                error: {
                    message: err.message,
                    location: {
                        start: err.location.start,
                        end: err.location.end
                    }
                }
            };
        }

        return {
            isValid: false,
            error: {
                message: JSON.stringify(error),
                location: {
                    start: {
                        column: 0,
                        line: 0,
                        offset: 0
                    },
                    end: {
                        column: 0,
                        line: 0,
                        offset: 0
                    }
                }
            }
        };
    }
}
