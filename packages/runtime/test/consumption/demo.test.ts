import axios from "axios";
import { http, HttpResponse } from "msw";
import { setupServer, SetupServerApi } from "msw/node";

test("Simple mocking example", async () => {
    const server: SetupServerApi = setupServer();
    server.listen({ onUnhandledRequest: "bypass" });

    server.use(
        http.post("https://test.de/test/:id/*", async ({ request, params }) => {
            // *: wildcard ; :id declares id as a path parameter
            const requestJson = await new Response(request.body).json();
            return HttpResponse.json({ ...requestJson, lastName: "Maverick", id: params.id }); // uses the declared id as path parameter
        })
    );

    const instance = axios.create({
        baseURL: "https://test.de"
    });
    const response = await instance.post("/test/id1/stuff", {
        firstName: "Fred"
    });
    expect(response.data).toStrictEqual({ firstName: "Fred", lastName: "Maverick", id: "id1" });
});
