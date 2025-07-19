import { CoreId } from "@nmshd/core-types";
import { TransportError, TransportIds } from "../../core";
import { BackboneDatawalletModification } from "./backbone/BackboneDatawalletModification";
import { CreateDatawalletModificationsRequestItem } from "./backbone/CreateDatawalletModifications";
import { DatawalletModification, DatawalletModificationCategory, DatawalletModificationType } from "./local/DatawalletModification";

export class DatawalletModificationMapper {
    public static async fromBackboneDatawalletModification(
        backboneDatawalletModification: BackboneDatawalletModification,
        decryptedPayload: object | undefined,
        datawalletVersion: number
    ): Promise<DatawalletModification> {
        let type: DatawalletModificationType;

        switch (backboneDatawalletModification.type) {
            case "Create":
                type = DatawalletModificationType.Create;
                break;
            case "Update":
                type = DatawalletModificationType.Update;
                break;
            case "Delete":
                type = DatawalletModificationType.Delete;
                break;
            default:
                throw new TransportError("Unsupported DatawalletModificationType '${backboneDatawalletModification.type}'");
        }

        let payloadCategory: DatawalletModificationCategory | undefined;

        switch (backboneDatawalletModification.payloadCategory) {
            case "TechnicalData":
                payloadCategory = DatawalletModificationCategory.TechnicalData;
                break;
            case "Content":
                payloadCategory = DatawalletModificationCategory.Content;
                break;
            case "Userdata":
                payloadCategory = DatawalletModificationCategory.Userdata;
                break;
            case "Metadata":
                payloadCategory = DatawalletModificationCategory.Metadata;
                break;
            case null:
                payloadCategory = undefined;
                break;
            default:
                throw new TransportError(`Unsupported DatawalletModificationCategory '${backboneDatawalletModification.payloadCategory}'`);
        }

        return DatawalletModification.from({
            localId: await TransportIds.datawalletModification.generate(),
            objectIdentifier: CoreId.from(backboneDatawalletModification.objectIdentifier),
            payloadCategory: payloadCategory,
            collection: backboneDatawalletModification.collection,
            type: type,
            payload: decryptedPayload,
            datawalletVersion: datawalletVersion
        });
    }

    public static toCreateDatawalletModificationsRequestItem(
        datawalletModification: DatawalletModification,
        encryptedPayload: string | undefined
    ): CreateDatawalletModificationsRequestItem {
        return {
            objectIdentifier: datawalletModification.objectIdentifier.toString(),
            payloadCategory: datawalletModification.payloadCategory,
            collection: datawalletModification.collection,
            type: datawalletModification.type,
            encryptedPayload: encryptedPayload,
            datawalletVersion: datawalletModification.datawalletVersion ?? 0
        };
    }
}
