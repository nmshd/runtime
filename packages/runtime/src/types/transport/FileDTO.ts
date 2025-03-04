export interface FileDTO {
    id: string;
    filename: string;
    tags?: string[];
    filesize: number;
    createdAt: string;
    createdBy: string;
    createdByDevice: string;
    expiresAt: string;
    mimetype: string;
    isOwn: boolean;
    title: string;
    description?: string;
    truncatedReference: string;
}
