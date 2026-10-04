import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type FetchHandler = (request: string, options: RequestInit) => Promise<Response>;

// Requests go through the real ofetch, only the network layer below it is replaced
const fetchMock = vi.fn<Parameters<FetchHandler>, ReturnType<FetchHandler>>();
vi.stubGlobal("fetch", fetchMock);

const runtimeConfig: { screeningApiUrl?: string } = {};
vi.stubGlobal("usePortalRuntimeConfig", () => runtimeConfig);

const SCREENING_API_URL = "https://screening.example/check";
const SCREENING_TIMEOUT = 15_000;
const ADDRESS = "0x1111111111111111111111111111111111111111";
const UNAVAILABLE_MESSAGE = /screening is temporarily unavailable/;
const BLOCKED_MESSAGE = "We were unable to process this transaction...";

const jsonResponse = (body: unknown) =>
  Promise.resolve(new Response(JSON.stringify(body), { headers: { "content-type": "application/json" } }));
const serviceUnavailable = () => Promise.resolve(new Response("Service Unavailable", { status: 503 }));
const networkError = () => Promise.reject(new TypeError("Failed to fetch"));

/* Never responds and fails once the request is aborted, like a hung connection */
const noResponse: FetchHandler = (_, { signal }) =>
  new Promise((_resolve, reject) => {
    const abort = () => reject(signal?.reason);
    if (signal?.aborted) abort();
    signal?.addEventListener("abort", abort);
  });

/* Sends the response headers, then the body never arrives until the request is aborted */
const stalledBody: FetchHandler = (_, { signal }) => {
  const body = new ReadableStream({
    start(controller) {
      signal?.addEventListener("abort", () => controller.error(signal.reason));
    },
  });
  return Promise.resolve(new Response(body, { headers: { "content-type": "application/json" } }));
};

let validateAddress: (address: string) => Promise<void>;

beforeEach(async () => {
  runtimeConfig.screeningApiUrl = SCREENING_API_URL;
  fetchMock.mockReset();
  // The screening cache lives at module scope, so every test gets a fresh module
  vi.resetModules();
  const { default: useScreening } = await import("@/composables/useScreening");
  validateAddress = useScreening().validateAddress;
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useScreening", () => {
  it("allows any address without a request when the screening service is not configured", async () => {
    runtimeConfig.screeningApiUrl = undefined;

    await expect(validateAddress(ADDRESS)).resolves.toBeUndefined();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("blocks on a network or CORS error", async () => {
    fetchMock.mockImplementation(networkError);

    await expect(validateAddress(ADDRESS)).rejects.toThrow(UNAVAILABLE_MESSAGE);
  });

  it("blocks on HTTP 503", async () => {
    fetchMock.mockImplementation(serviceUnavailable);

    await expect(validateAddress(ADDRESS)).rejects.toThrow(UNAVAILABLE_MESSAGE);
  });

  it.each<[string, FetchHandler[]]>([
    ["the request hangs", [noResponse]],
    ["the retry after HTTP 503 hangs", [serviceUnavailable, noResponse]],
    ["the response body stalls", [stalledBody]],
  ])("blocks when the service does not answer in time (%s)", async (_, responses) => {
    vi.useFakeTimers();
    // Any request past the listed ones hangs as well
    fetchMock.mockImplementation(noResponse);
    responses.forEach((response) => fetchMock.mockImplementationOnce(response));

    const result = validateAddress(ADDRESS).then(
      () => "allowed",
      (error: Error) => error.message
    );
    const settled = () => Promise.race([result, "pending"]);

    await vi.advanceTimersByTimeAsync(SCREENING_TIMEOUT - 1);
    expect(await settled()).toBe("pending");
    await vi.advanceTimersByTimeAsync(1);
    expect(await settled()).toMatch(UNAVAILABLE_MESSAGE);
  });

  // e.g. a maintenance or challenge page that a proxy serves with HTTP 200
  it.each([
    [
      "an HTML page",
      () => Promise.resolve(new Response("<html>Maintenance</html>", { headers: { "content-type": "text/html" } })),
    ],
    ["JSON without a result", () => jsonResponse({ status: "ok" })],
    ["an empty body", () => Promise.resolve(new Response(""))],
  ])("reports %s as unavailable, not as a rejected address", async (_, response) => {
    fetchMock.mockImplementation(response);

    await expect(validateAddress(ADDRESS)).rejects.toThrow(UNAVAILABLE_MESSAGE);
  });

  it.each([
    ["a failed request", networkError, UNAVAILABLE_MESSAGE],
    ["a response without a result", () => jsonResponse({}), UNAVAILABLE_MESSAGE],
    ["a rejection", () => jsonResponse({ result: false }), BLOCKED_MESSAGE],
  ])("screens again after %s", async (_, firstResponse, message) => {
    fetchMock.mockImplementation(firstResponse);
    await expect(validateAddress(ADDRESS)).rejects.toThrow(message);

    fetchMock.mockReset().mockImplementation(() => jsonResponse({ result: true }));
    await expect(validateAddress(ADDRESS)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("reuses an allowed result for the same address", async () => {
    fetchMock.mockImplementation(() => jsonResponse({ result: true }));

    await expect(validateAddress(ADDRESS)).resolves.toBeUndefined();
    await expect(validateAddress(ADDRESS)).resolves.toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(`${SCREENING_API_URL}?address=${ADDRESS}`, expect.anything());
  });
});
