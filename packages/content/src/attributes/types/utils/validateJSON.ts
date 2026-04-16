export function validateJSON(value: any): string | undefined {
    try {
        const string = JSON.stringify(value);
        if (string.length > 4096) {
            return "stringified value must not be longer than 4096 characters";
        }
    } catch (e) {
        if (e instanceof SyntaxError) {
            return "must be a valid JSON object";
        }

        return "could not validate value";
    }

    return undefined;
}
