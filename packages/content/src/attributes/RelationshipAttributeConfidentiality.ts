export enum RelationshipAttributeConfidentiality {
    /**
     * If a third party queries a public RelationshipAttribute from an Identity, there is no
     * warning message for a user that possibly sensitive information from within a Relationship
     * is shared to a third party. However, this does not mean that the request for such an
     * Attribute can or is automatically accepted, as the user might not want to share it with
     * this third party - nevertheless it is public.
     *
     * Good examples for public RelationshipAttributes are bonus membership ids or social network
     * account names/channels.
     */
    Public = "public",
    /**
     * A private Attribute may never be queried by a third party. Even if queried, a user cannot
     * "override" this rule and accept such a sharing request. Querying such an Attribute will
     * result in an error.
     *
     * An example would be a telephone PIN with a bank which is used as the authentication factor.
     */
    Private = "private",
    /**
     * A protected RelationshipAttribute may be queried by a third party, but the user is
     * specifically warned about this query and needs to give consent.
     *
     * This is great for all kinds of scenarios, in which giving out the RelationshipAttribute
     * is a "common real-world edge case". For example given out a car insurance id to the
     * other party once you had an accident.
     */
    Protected = "protected"
}
