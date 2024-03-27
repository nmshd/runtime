import axios from "axios";
import { http, HttpResponse } from "msw";
import { setupServer, SetupServerApi } from "msw/node";

test("Simple mocking example", async () => {
    const server: SetupServerApi = setupServer();
    server.listen({ onUnhandledRequest: "bypass" });
    interface Name {
        firstName: string;
        lastName: string;
        id: string;
    }
    server.use(
        http.post<any, any, Name, any>("https://test.de/test/:id/*", async ({ request, params }) => {
            // *: wildcard ; :id declares id as a path parameter
            const requestJson = await new Response(request.body).json();
            return HttpResponse.json({ ...requestJson, lastName: "Maverick", id: params.id }); // uses the declared id as path parameter
        })
    );

    // the following code would not compile due to the wrong type

    // server.use(
    //     http.post<any, any, Name, any>("https://test.de/test", () => {
    //         return HttpResponse.json({ lastName: "name" });
    //     })
    // );

    const instance = axios.create({
        baseURL: "https://test.de"
    });
    const response = await instance.post("/test/id1/stuff", {
        firstName: "Fred"
    });

    server.close();
    expect(response.data).toStrictEqual({ firstName: "Fred", lastName: "Maverick", id: "id1" });
});
