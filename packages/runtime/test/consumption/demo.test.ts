import axios from "axios";
import { http, HttpResponse } from "msw";
import { setupServer, SetupServerApi } from "msw/node";

type Name = {
    firstName: string;
    lastName: string;
};

test("Simple mocking example", async () => {
    const server: SetupServerApi = setupServer();
    server.listen({ onUnhandledRequest: "bypass" });

    server.use(
        http.post<any, any, Name, any>("https://test.de/test", async ({ request }) => {
            const requestJson = await new Response(request.body).json();
            return HttpResponse.json({ ...requestJson, secondName: "Maverick" });
        })
    );

    const instance = axios.create({
        baseURL: "https://test.de"
    });
    const response = await instance.post("/test", {
        firstName: "Fred"
    });
    expect(response.data).toStrictEqual({ firstName: "Fred", lastName: "Maverick" } as Name);
});
