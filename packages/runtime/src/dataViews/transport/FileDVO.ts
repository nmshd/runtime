import { DataViewObject } from "../DataViewObject.js";
import { IdentityDVO } from "./IdentityDVO.js";

export interface FileDVO extends DataViewObject {
    type: "FileDVO";
    filename: string;
    tags?: string[];
    filesize: number;
    createdAt: string;
    createdBy: IdentityDVO;
    createdByDevice: string;
    expiresAt: string;
    mimetype: string;
    isOwn: boolean;
    title: string;
    reference: {
        truncated: string;
        url: string;
    };
    owner: IdentityDVO;
}
