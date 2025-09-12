import { OwnRelationshipAttribute } from "./OwnRelationshipAttribute";
import { PeerIdentityAttribute } from "./PeerIdentityAttribute";
import { PeerRelationshipAttribute } from "./PeerRelationshipAttribute";
import { ThirdPartyRelationshipAttribute } from "./ThirdPartyRelationshipAttribute";

export type AttributeWithPeerSharingInfo = PeerIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute | ThirdPartyRelationshipAttribute;
