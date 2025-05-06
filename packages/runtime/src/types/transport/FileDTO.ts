export type FileDTO = {
    id: string;
    filename: string;
    tags?: string[];
    filesize: number;
    createdAt: string;
    createdBy: string;
    createdByDevice: string;
    expiresAt: string;
    mimetype: string;
    title: string;
    description?: string;
} & (
    | {
          isOwn: true;
          truncatedReference: string;
          url: string;
      }
    | {
          isOwn: false;
          truncatedReference: undefined;
          url: undefined;
      }
);
