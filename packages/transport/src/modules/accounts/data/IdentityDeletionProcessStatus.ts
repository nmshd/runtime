export enum IdentityDeletionProcessStatus {
    // TODO: Timo: rename 'WaitingForApproval' zu 'Pending'.
    //       - wäre konsistent mit Benennung der Usecases.
    WaitingForApproval = "WaitingForApproval",
    Rejected = "Rejected",
    Approved = "Approved",
    Deleting = "Deleting",
    Cancelled = "Cancelled"
}

// TODO: Idee: Finaler Terminierungsstatus
//       - müsste manuell durch Runtime gesetzt werden
//       - wäre für App mglw. nützlich zur Anzeige
