import { DcqlQuery, JsonTransformer } from "@credo-ts/core";
import { DCQLQueryJSON, VerifiableCredential, VerifiableCredentialJSON } from "@nmshd/content";
import { ConsumptionBaseController } from "../../consumption/ConsumptionBaseController";
import { ConsumptionController } from "../../consumption/ConsumptionController";
import { ConsumptionControllerName } from "../../consumption/ConsumptionControllerName";
import { LocalAttribute } from "../attributes";
import { Holder } from "./local/Holder";

export class OpenId4VcController extends ConsumptionBaseController {
    public constructor(parent: ConsumptionController) {
        super(ConsumptionControllerName.OpenId4VcController, parent);
    }

    public async fetchCredentialOffer(credentialOfferUrl: string): Promise<any> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const res = await holder.resolveCredentialOffer(credentialOfferUrl);
        return {
            data: JSON.stringify(res)
        };
    }

    public async processFetchedCredentialOffer(fetchedCredentialOffer: string, requestedCredentialOffers: string[], pinCode?: string): Promise<any> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const credentialOffer = JSON.parse(fetchedCredentialOffer);
        const credentials = await holder.requestAndStoreCredentials(credentialOffer, { credentialsToRequest: requestedCredentialOffers, txCode: pinCode });
        return {
            status: "success",
            message: "Credential offer processed successfully",
            data: JSON.stringify(credentials),
            // multi credentials not supported yet
            id: credentials.length > 0 ? credentials[0].id : undefined
        };
    }

    public async processCredentialOffer(credentialOffer: string): Promise<any> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const res = await holder.resolveCredentialOffer(credentialOffer);
        const credentials = await holder.requestAndStoreCredentials(res, { credentialsToRequest: ["EmployeeIdCard-sdjwt"] });

        return {
            status: "success",
            message: "Credential offer processed successfully",
            data: JSON.stringify(credentials)
        };
    }

    public async fetchProofRequest(proofRequestUrl: string): Promise<any> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const res = await holder.resolveProofRequest(proofRequestUrl);
        return {
            data: JSON.stringify(res)
        };
    }

    public async getMatchingCredentialsForDcql(query: DcqlQuery): Promise<{ attribute: LocalAttribute; presentation: unknown }[]> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");

        // this assumes the simplest form of the dcql query - where only one credential is requested
        const dcqlQueryId = query.credentials[0].id;
        const queryResult = await holder.getMatchingCredentialsForDcql(query);

        const presentations = await Promise.all(queryResult[dcqlQueryId].valid_credentials!.map(async (c) => await holder.createPresentationForDcql(dcqlQueryId, c)));

        const matchingCredentials = queryResult[dcqlQueryId].valid_credentials!.map((c: any) => JsonTransformer.serialize(c.record));
        const credentialAttributes = await this.parent.attributes.getLocalAttributes({
            shareInfo: {
                $exists: false
            },
            "content.value.@type": "VerifiableCredential"
        });

        const matchingAttributes = matchingCredentials.map((c) => credentialAttributes.find((a) => ((a.content.value as VerifiableCredential).value as any) === c));
        // TODO: implement SD
        return presentations.map((p, i) => {
            return { presentation: p, attribute: matchingAttributes[i]! };
        });
    }

    public async verifyPresentation(query: DCQLQueryJSON, presentation: VerifiableCredentialJSON): Promise<{ verified: true } | { verified: false; reason: string }> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");

        return await holder.verifyPresentationForDcql(query.query as DcqlQuery, presentation.value);
    }

    public async acceptProofRequest(jsonEncodedRequest: string): Promise<any> {
        const holder = new Holder(this.parent.accountController, this.parent.attributes);
        await holder.initializeAgent("96213c3d7fc8d4d6754c7a0fd969598e");
        const fetchedRequest = JSON.parse(jsonEncodedRequest);
        // parse the credential type to be sdjwt

        const serverResponse = await holder.acceptPresentationRequest(fetchedRequest);
        return {
            status: serverResponse.status,
            message: serverResponse.body
        };
    }
}
