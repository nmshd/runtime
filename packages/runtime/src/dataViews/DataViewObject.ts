import { DVOError } from "./common/DVOError";
import { DVOWarning } from "./common/DVOWarning";

export interface DataViewObject {
    id: string;
    name: string;
    description?: string;
    image?: string;
    type: string;
    date?: string;
    items?: any[];

    error?: DVOError;
    warning?: DVOWarning;
}
