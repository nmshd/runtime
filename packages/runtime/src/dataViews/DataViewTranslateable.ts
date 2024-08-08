export class DataViewTranslateable {
    public static readonly prefix: string = "i18n://dvo.";
    public static readonly transport = {
        messageName: `${DataViewTranslateable.prefix}message.name`,
        relationshipOutgoing: `${DataViewTranslateable.prefix}relationship.Outgoing`,
        relationshipIncoming: `${DataViewTranslateable.prefix}relationship.Incoming`,
        relationshipRejected: `${DataViewTranslateable.prefix}relationship.Rejected`,
        relationshipRevoked: `${DataViewTranslateable.prefix}relationship.Revoked`,
        relationshipActive: `${DataViewTranslateable.prefix}relationship.Active`,
        relationshipTerminated: `${DataViewTranslateable.prefix}relationship.Terminated`,
        relationshipDeletionProposed: `${DataViewTranslateable.prefix}relationship.DeletionProposed`,
        fileName: `${DataViewTranslateable.prefix}file.name`
    };

    public static readonly consumption = {
        mails: {
            mailSubjectFallback: `${DataViewTranslateable.prefix}mails.mailSubjectFallback`
        },
        attributes: {
            unknownAttributeName: `${DataViewTranslateable.prefix}attributes.UnknownAttributeName`
        },
        identities: {
            self: `${DataViewTranslateable.prefix}identities.self.name`
        }
    };
}
