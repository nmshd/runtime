import { IOwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfo, OwnRelationshipAttributeSharingInfoJSON } from "./OwnRelationshipAttributeSharingInfo";
import { IPeerIdentityAttributeSharingInfo, PeerIdentityAttributeSharingInfo, PeerIdentityAttributeSharingInfoJSON } from "./PeerIdentityAttributeSharingInfo";
import { IPeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfo, PeerRelationshipAttributeSharingInfoJSON } from "./PeerRelationshipAttributeSharingInfo";
import {
    IThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeSharingInfo,
    ThirdPartyRelationshipAttributeSharingInfoJSON
} from "./ThirdPartyRelationshipAttributeSharingInfo";

export type PeerSharingInfoJSON =
    | PeerIdentityAttributeSharingInfoJSON
    | OwnRelationshipAttributeSharingInfoJSON
    | PeerRelationshipAttributeSharingInfoJSON
    | ThirdPartyRelationshipAttributeSharingInfoJSON;

export type IPeerSharingInfo =
    | IPeerIdentityAttributeSharingInfo
    | IOwnRelationshipAttributeSharingInfo
    | IPeerRelationshipAttributeSharingInfo
    | IThirdPartyRelationshipAttributeSharingInfo;

export type PeerSharingInfo =
    | PeerIdentityAttributeSharingInfo
    | OwnRelationshipAttributeSharingInfo
    | PeerRelationshipAttributeSharingInfo
    | ThirdPartyRelationshipAttributeSharingInfo;
