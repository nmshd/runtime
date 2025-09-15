import { OwnIdentityAttribute } from "./OwnIdentityAttribute";
import { OwnRelationshipAttribute } from "./OwnRelationshipAttribute";
import { PeerRelationshipAttribute } from "./PeerRelationshipAttribute";

export type ForwardableAttribute = OwnIdentityAttribute | OwnRelationshipAttribute | PeerRelationshipAttribute;
