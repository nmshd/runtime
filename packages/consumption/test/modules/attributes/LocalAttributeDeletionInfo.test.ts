import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions";
import { ValidationError } from "@js-soft/ts-serval";
import { EMailAddress, IdentityAttribute, ProprietaryEMailAddress, RelationshipAttribute, RelationshipAttributeConfidentiality } from "@nmshd/content";
import { CoreAddress, CoreDate, CoreId } from "@nmshd/core-types";
import { AccountController, Transport } from "@nmshd/transport";
import { ConsumptionController, LocalAttribute, LocalAttributeDeletionInfo, LocalAttributeDeletionStatus } from "../../../src";
import { TestUtil } from "../../core/TestUtil";

describe("LocalAttributeDeletionInfo", function () {
    let connection: IDatabaseConnection;
    let transport: Transport;

    let consumptionController: ConsumptionController;
    let testAccount: AccountController;

    let repositoryAttribute: LocalAttribute;
    let ownSharedIdentityAttribute: LocalAttribute;
    let peerSharedIdentityAttribute: LocalAttribute;
    let thirdPartyRelationshipAttribute: LocalAttribute;

    beforeAll(async function () {
        connection = await TestUtil.createConnection();
        transport = TestUtil.createTransport();
        await transport.init();

        const account = (await TestUtil.provideAccounts(transport, connection, 1))[0];
        ({ accountController: testAccount, consumptionController } = account);
    });

    afterAll(async function () {
        await testAccount.close();
        await connection.close();
    });

    beforeEach(async function () {
        repositoryAttribute = await consumptionController.attributes.createRepositoryAttribute({
            content: IdentityAttribute.from({
                value: EMailAddress.from({
                    value: "my@email.com"
                }),
                owner: testAccount.identity.address
            })
        });

        ownSharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttributeCopy({
            sourceAttributeId: repositoryAttribute.id,
            peer: CoreAddress.from("peer"),
            requestReference: CoreId.from("request")
        });

        peerSharedIdentityAttribute = await consumptionController.attributes.createSharedLocalAttribute({
            content: IdentityAttribute.from({
                value: EMailAddress.from({
                    value: "peer@email.com"
                }),
                owner: CoreAddress.from("peer")
            }),
            peer: CoreAddress.from("peer"),
            requestReference: CoreId.from("request")
        });

        thirdPartyRelationshipAttribute = await consumptionController.attributes.createSharedLocalAttribute({
            content: RelationshipAttribute.from({
                value: ProprietaryEMailAddress.from({
                    value: "thirdParty@email.com",
                    title: "A mail title"
                }),
                key: "A mail key",
                confidentiality: RelationshipAttributeConfidentiality.Public,
                owner: CoreAddress.from("thirdParty")
            }),
            peer: CoreAddress.from("peer"),
            requestReference: CoreId.from("request"),
            thirdPartyAddress: CoreAddress.from("thirdPartyAddress")
        });
    });

    afterEach(async function () {
        const attributes = await consumptionController.attributes.getLocalAttributes();

        for (const attribute of attributes) {
            await consumptionController.attributes.deleteAttribute(attribute);
        }
    });

    describe("DeletionInfo of own shared Attributes", function () {
        test("should set the deletionInfo of an own shared Attribute to DeletionRequestSent", async function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletionRequestSent, deletionDate: CoreDate.utc() });

            ownSharedIdentityAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            await consumptionController.attributes.updateAttributeUnsafe(ownSharedIdentityAttribute);

            const updatedOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(ownSharedIdentityAttribute.id);
            expect(updatedOwnSharedIdentityAttribute!.deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.DeletionRequestSent);
        });

        test("should set the deletionInfo of an own shared Attribute to DeletionRequestRejected", async function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletionRequestRejected, deletionDate: CoreDate.utc() });

            ownSharedIdentityAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            await consumptionController.attributes.updateAttributeUnsafe(ownSharedIdentityAttribute);

            const updatedOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(ownSharedIdentityAttribute.id);
            expect(updatedOwnSharedIdentityAttribute!.deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.DeletionRequestRejected);
        });

        test("should set the deletionInfo of an own shared Attribute to ToBeDeletedByPeer", async function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.ToBeDeletedByPeer, deletionDate: CoreDate.utc() });

            ownSharedIdentityAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            await consumptionController.attributes.updateAttributeUnsafe(ownSharedIdentityAttribute);

            const updatedOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(ownSharedIdentityAttribute.id);
            expect(updatedOwnSharedIdentityAttribute!.deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.ToBeDeletedByPeer);
        });

        test("should set the deletionInfo of an own shared Attribute to DeletedByPeer", async function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer, deletionDate: CoreDate.utc() });

            ownSharedIdentityAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            await consumptionController.attributes.updateAttributeUnsafe(ownSharedIdentityAttribute);

            const updatedOwnSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(ownSharedIdentityAttribute.id);
            expect(updatedOwnSharedIdentityAttribute!.deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.DeletedByPeer);
        });

        test("should throw trying to set the deletionInfo of an own shared Attribute to ToBeDeleted", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.ToBeDeleted, deletionDate: CoreDate.utc() });

            expect(() => {
                ownSharedIdentityAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("The only valid deletionStatuses for own shared Attributes are 'DeletionRequestSent', 'DeletionRequestRejected', 'DeletedByPeer' or 'ToBeDeletedByPeer'.");
        });

        test("should throw trying to set the deletionInfo of an own shared Attribute to DeletedByOwner", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletedByOwner, deletionDate: CoreDate.utc() });

            expect(() => {
                ownSharedIdentityAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("The only valid deletionStatuses for own shared Attributes are 'DeletionRequestSent', 'DeletionRequestRejected', 'DeletedByPeer' or 'ToBeDeletedByPeer'.");
        });
    });

    describe("DeletionInfo of peer shared Attributes", function () {
        test("should set the deletionInfo of a peer shared Attribute to ToBeDeleted", async function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.ToBeDeleted, deletionDate: CoreDate.utc() });

            peerSharedIdentityAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            await consumptionController.attributes.updateAttributeUnsafe(peerSharedIdentityAttribute);

            const updatedPeerSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(peerSharedIdentityAttribute.id);
            expect(updatedPeerSharedIdentityAttribute!.deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.ToBeDeleted);
        });

        test("should set the deletionInfo of a peer shared Attribute to DeletedByOwner", async function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletedByOwner, deletionDate: CoreDate.utc() });

            peerSharedIdentityAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            await consumptionController.attributes.updateAttributeUnsafe(peerSharedIdentityAttribute);

            const updatedPeerSharedIdentityAttribute = await consumptionController.attributes.getLocalAttribute(peerSharedIdentityAttribute.id);
            expect(updatedPeerSharedIdentityAttribute!.deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.DeletedByOwner);
        });

        test("should throw trying to set the deletionInfo of a peer shared Attribute to DeletionRequestSent", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletionRequestSent, deletionDate: CoreDate.utc() });

            expect(() => {
                peerSharedIdentityAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("The only valid deletionStatuses for peer shared Attributes are 'DeletedByOwner' or 'ToBeDeleted'.");
        });

        test("should throw trying to set the deletionInfo of a peer shared Attribute to DeletionRequestRejected", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletionRequestRejected, deletionDate: CoreDate.utc() });

            expect(() => {
                peerSharedIdentityAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("The only valid deletionStatuses for peer shared Attributes are 'DeletedByOwner' or 'ToBeDeleted'.");
        });

        test("should throw trying to set the deletionInfo of a peer shared Attribute to ToBeDeletedByPeer", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.ToBeDeletedByPeer, deletionDate: CoreDate.utc() });

            expect(() => {
                peerSharedIdentityAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("The only valid deletionStatuses for peer shared Attributes are 'DeletedByOwner' or 'ToBeDeleted'.");
        });

        test("should throw trying to set the deletionInfo of a peer shared Attribute to DeletedByPeer", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer, deletionDate: CoreDate.utc() });

            expect(() => {
                peerSharedIdentityAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("The only valid deletionStatuses for peer shared Attributes are 'DeletedByOwner' or 'ToBeDeleted'.");
        });
    });

    describe("DeletionInfo of ThirdPartyRelationshipAttributes", function () {
        test("should set the deletionInfo of a ThirdPartyRelationshipAttribute to DeletedByPeer", async function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer, deletionDate: CoreDate.utc() });

            thirdPartyRelationshipAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            await consumptionController.attributes.updateAttributeUnsafe(thirdPartyRelationshipAttribute);

            const updatedThirdPartyRelationshipAttribute = await consumptionController.attributes.getLocalAttribute(thirdPartyRelationshipAttribute.id);
            expect(updatedThirdPartyRelationshipAttribute!.deletionInfo!.deletionStatus).toBe(LocalAttributeDeletionStatus.DeletedByPeer);
        });

        test("should throw trying to set the deletionInfo of a ThirdPartyRelationshipAttribute to DeletedByOwner", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletedByOwner, deletionDate: CoreDate.utc() });

            expect(() => {
                thirdPartyRelationshipAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("The only valid deletionStatus for ThirdPartyRelationshipAttributes is 'DeletedByPeer'.");
        });

        test("should throw trying to set the deletionInfo of a ThirdPartyRelationshipAttribute to DeletionRequestSent", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletionRequestSent, deletionDate: CoreDate.utc() });

            expect(() => {
                thirdPartyRelationshipAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("The only valid deletionStatus for ThirdPartyRelationshipAttributes is 'DeletedByPeer'.");
        });

        test("should throw trying to set the deletionInfo of a ThirdPartyRelationshipAttribute to DeletionRequestRejected", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletionRequestRejected, deletionDate: CoreDate.utc() });

            expect(() => {
                thirdPartyRelationshipAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("The only valid deletionStatus for ThirdPartyRelationshipAttributes is 'DeletedByPeer'.");
        });

        test("should throw trying to set the deletionInfo of a ThirdPartyRelationshipAttribute to ToBeDeletedByPeer", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.ToBeDeletedByPeer, deletionDate: CoreDate.utc() });

            expect(() => {
                thirdPartyRelationshipAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("The only valid deletionStatus for ThirdPartyRelationshipAttributes is 'DeletedByPeer'.");
        });

        test("should throw trying to set the deletionInfo of a ThirdPartyRelationshipAttribute to ToBeDeleted", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.ToBeDeleted, deletionDate: CoreDate.utc() });

            expect(() => {
                thirdPartyRelationshipAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("The only valid deletionStatus for ThirdPartyRelationshipAttributes is 'DeletedByPeer'.");
        });
    });

    describe("DeletionInfo of RepositoryAttributes", function () {
        test("should throw trying to set the deletionInfo of a RepositoryAttribute to DeletionRequestSent", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletionRequestSent, deletionDate: CoreDate.utc() });

            expect(() => {
                repositoryAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("RepositoryAttributes can not have a deletionInfo, since they are not shared with a peer and you can delete them directly.");
        });

        test("should throw trying to set the deletionInfo of a RepositoryAttribute to DeletionRequestRejected", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletionRequestRejected, deletionDate: CoreDate.utc() });

            expect(() => {
                repositoryAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("RepositoryAttributes can not have a deletionInfo, since they are not shared with a peer and you can delete them directly.");
        });

        test("should throw trying to set the deletionInfo of a RepositoryAttribute to DeletedByPeer", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletedByPeer, deletionDate: CoreDate.utc() });

            expect(() => {
                repositoryAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("RepositoryAttributes can not have a deletionInfo, since they are not shared with a peer and you can delete them directly.");
        });

        test("should throw trying to set the deletionInfo of a RepositoryAttribute to DeletedByOwner", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.DeletedByOwner, deletionDate: CoreDate.utc() });

            expect(() => {
                repositoryAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("RepositoryAttributes can not have a deletionInfo, since they are not shared with a peer and you can delete them directly.");
        });

        test("should throw trying to set the deletionInfo of a RepositoryAttribute to ToBeDeletedByPeer", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.ToBeDeletedByPeer, deletionDate: CoreDate.utc() });

            expect(() => {
                repositoryAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("RepositoryAttributes can not have a deletionInfo, since they are not shared with a peer and you can delete them directly.");
        });

        test("should throw trying to set the deletionInfo of a RepositoryAttribute to ToBeDeleted", function () {
            const deletionInfo = LocalAttributeDeletionInfo.from({ deletionStatus: LocalAttributeDeletionStatus.ToBeDeleted, deletionDate: CoreDate.utc() });

            expect(() => {
                repositoryAttribute.setDeletionInfo(deletionInfo, testAccount.identity.address);
            }).toThrow("RepositoryAttributes can not have a deletionInfo, since they are not shared with a peer and you can delete them directly.");
        });
    });

    test("should throw trying to set an invalid deletionInfo", function () {
        expect(() => {
            LocalAttributeDeletionInfo.from({ deletionStatus: "Deleted" as any, deletionDate: CoreDate.utc().toString() });
        }).toThrow(ValidationError);
    });
});
