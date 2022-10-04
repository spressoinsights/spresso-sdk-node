import { SuperAgent, SuperAgentRequest, Response as SuperAgentResponse } from 'superagent';
import superagent from 'superagent';

export type Response = SuperAgentResponse;

export class HttpClient {
    private readonly client: SuperAgent<SuperAgentRequest>;

    constructor() {
        // Todo reuse tcp connection
        this.client = superagent.agent();
    }

    public async get(url: string, headers: Record<string, string>): Promise<Response> {
        return this.client.get(url).set(headers);
    }

    public async post(url: string, headers: Record<string, string>, input: Record<string, unknown>): Promise<Response> {
        return this.client.post(url).set(headers).send(input);
    }

    public async put(url: string, headers: Record<string, string>, input: Record<string, unknown>): Promise<Response> {
        return this.client.put(url).send(headers).send(input);
    }

    public async patch(
        url: string,
        headers: Record<string, string>,
        input: Record<string, unknown>
    ): Promise<Response> {
        return this.client.patch(url).set(headers).send(input);
    }

    public async delete(
        url: string,
        headers: Record<string, string>,
        input: Record<string, unknown>
    ): Promise<Response> {
        return this.client.delete(url).set(headers).send(input);
    }
}
