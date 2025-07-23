import {
    ForwardedRelationshipAttributeSharingInfo,
    ForwardedRelationshipAttributeSharingInfoJSON,
    IForwardedRelationshipAttributeSharingInfo
} from "./ForwardedRelationshipAttributeSharingInfo";
import { IOwnIdentityAttributeSharingInfo, OwnIdentityAttributeSharingInfo, OwnIdentityAttributeSharingInfoJSON } from "./OwnIdentityAttributeSharingInfo";

export type ForwardedSharingInfoJSON = OwnIdentityAttributeSharingInfoJSON | ForwardedRelationshipAttributeSharingInfoJSON;

export type IForwardedSharingInfo = IOwnIdentityAttributeSharingInfo | IForwardedRelationshipAttributeSharingInfo;

export type ForwardedSharingInfo = OwnIdentityAttributeSharingInfo | ForwardedRelationshipAttributeSharingInfo;
