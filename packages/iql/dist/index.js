"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.execute = execute;
exports.validate = validate;
const iql_gen_js_1 = require("./iql.gen.js");
/**
 * Executes IQL query, returning array of indicies of matched attributes in
 * attribute array.
 */
function execute(iqlQuery, attributes) {
    return (0, iql_gen_js_1.parse)(iqlQuery, { attributes });
}
function validate(iqlQuery) {
    try {
        (0, iql_gen_js_1.parse)(iqlQuery, { attributes: [] });
        return { isValid: true };
    }
    catch (error) {
        // FIXME: Is there a cleaner way to catch IQL SyntaxErrors?
        //        For the sake of backwards compatibility peggy compiles to old
        //        js without the use of classes. Thus the static type inference
        //        for the SyntaxError type is severely crippled.
        if (error instanceof iql_gen_js_1.SyntaxError) {
            const err = error; // see FIXME above.
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
//# sourceMappingURL=index.js.map