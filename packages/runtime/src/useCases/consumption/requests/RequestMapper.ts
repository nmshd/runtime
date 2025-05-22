import { LocalRequest } from "@nmshd/consumption";
import { LocalRequestDTO } from "../../../types";

export class RequestMapper {
    public static toLocalRequestDTO(request: LocalRequest): LocalRequestDTO {
        return {
            id: request.id.toString(),
            isOwn: request.isOwn,
            peer: request.peer.toString(),
            createdAt: request.createdAt.toString(),
            content: request.content.toJSON(),
            source: request.source
                ? {
                      type: request.source.type,
                      reference: request.source.reference.toString()
                  }
                : undefined,
            response: request.response
                ? {
                      createdAt: request.response.createdAt.toString(),
                      content: request.response.content.toJSON(),
                      source: request.response.source
                          ? {
                                type: request.response.source.type,
                                reference: request.response.source.reference.toString()
                            }
                          : undefined
                  }
                : undefined,
            status: request.status,
            wasAutomaticallyDecided: request.wasAutomaticallyDecided
        };
    }

    public static toLocalRequestDTOList(requests: LocalRequest[]): LocalRequestDTO[] {
        return requests.map((request) => this.toLocalRequestDTO(request));
    }
}
