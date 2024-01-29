export interface PlatformError {
    id: string;
    code: string;
    details: string | null;
    message: string;
    docs: string;
    status: number | null;
    time: string;
}
