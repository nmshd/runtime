import { PlatformError } from "./PlatformError.js";

export interface PlatformResponse<T> {
    result?: T;
    error?: PlatformError;
}

export interface PaginationProperties {
    pageNumber: number;
    pageSize: number;
    totalPages: number;
    totalRecords: number;
}

export interface PaginatedPlatformResponse<T> {
    result?: T;
    error?: PlatformError;
    pagination?: PaginationProperties;
}
