import {
    IOwnRelationshipAttributeSharingDetails,
    OwnRelationshipAttributeSharingDetails,
    OwnRelationshipAttributeSharingDetailsJSON
} from "./OwnRelationshipAttributeSharingDetails";
import { IPeerIdentityAttributeSharingDetails, PeerIdentityAttributeSharingDetails, PeerIdentityAttributeSharingDetailsJSON } from "./PeerIdentityAttributeSharingDetails";
import {
    IPeerRelationshipAttributeSharingDetails,
    PeerRelationshipAttributeSharingDetails,
    PeerRelationshipAttributeSharingDetailsJSON
} from "./PeerRelationshipAttributeSharingDetails";
import {
    IThirdPartyRelationshipAttributeSharingDetails,
    ThirdPartyRelationshipAttributeSharingDetails,
    ThirdPartyRelationshipAttributeSharingDetailsJSON
} from "./ThirdPartyRelationshipAttributeSharingDetails";

export type PeerSharingDetailsJSON =
    | PeerIdentityAttributeSharingDetailsJSON
    | OwnRelationshipAttributeSharingDetailsJSON
    | PeerRelationshipAttributeSharingDetailsJSON
    | ThirdPartyRelationshipAttributeSharingDetailsJSON;

export type IPeerSharingDetails =
    | IPeerIdentityAttributeSharingDetails
    | IOwnRelationshipAttributeSharingDetails
    | IPeerRelationshipAttributeSharingDetails
    | IThirdPartyRelationshipAttributeSharingDetails;

export type PeerSharingDetails =
    | PeerIdentityAttributeSharingDetails
    | OwnRelationshipAttributeSharingDetails
    | PeerRelationshipAttributeSharingDetails
    | ThirdPartyRelationshipAttributeSharingDetails;
