export default async function middleware(request: Request) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const backendUrl = new URL(request.url);
    backendUrl.pathname = "/";
    const headers = new Headers(request.headers);
    headers.set("x-path", pathname);
    const newRequest = new Request(backendUrl.toString(), {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
    });
    return fetch(newRequest);
  }