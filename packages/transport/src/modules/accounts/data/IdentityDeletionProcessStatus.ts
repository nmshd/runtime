export enum IdentityDeletionProcessStatus {
    WaitingForApproval = "WaitingForApproval",
    Rejected = "Rejected",
    Approved = "Approved",
    Deleting = "Deleting",
    Cancelled = "Cancelled"
}

// TODO: Idee: Finaler Terminierungsstatus
//       - müsste manuell durch Runtime gesetzt werden
//       - wäre für App mglw. nützlich zur Anzeige
