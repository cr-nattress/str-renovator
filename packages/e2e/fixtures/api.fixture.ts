import { test as base, type Page } from "@playwright/test";

export interface ApiClient {
  get<T = unknown>(path: string): Promise<T>;
  post<T = unknown>(path: string, body?: unknown): Promise<T>;
  patch<T = unknown>(path: string, body?: unknown): Promise<T>;
  del(path: string): Promise<void>;
  postFormData<T = unknown>(path: string, formData: FormData): Promise<T>;
  getToken(): Promise<string>;
}

export const apiFixture = base.extend<{
  api: ApiClient;
}>({
  api: async ({ page }, use) => {
    const apiURL = process.env.E2E_API_URL ?? "http://localhost:3001";

    async function getToken(): Promise<string> {
      return page.evaluate(async () => {
        // Clerk injects session into window
        const w = window as unknown as {
          Clerk?: { session?: { getToken: () => Promise<string> } };
        };
        if (!w.Clerk?.session) throw new Error("Clerk session not available");
        return w.Clerk.session.getToken();
      });
    }

    async function request<T>(
      method: string,
      path: string,
      body?: unknown
    ): Promise<T> {
      const token = await getToken();
      const res = await page.evaluate(
        async ({ apiURL, method, path, body, token }) => {
          const opts: RequestInit = {
            method,
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          };
          if (body) opts.body = JSON.stringify(body);
          const r = await fetch(`${apiURL}${path}`, opts);
          if (r.status === 204) return null;
          return r.json();
        },
        { apiURL, method, path, body, token }
      );
      return res as T;
    }

    const client: ApiClient = {
      get: <T>(path: string) => request<T>("GET", path),
      post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
      patch: <T>(path: string, body?: unknown) =>
        request<T>("PATCH", path, body),
      del: async (path: string) => {
        await request("DELETE", path);
      },
      getToken,
      postFormData: async <T>(path: string, formData: FormData): Promise<T> => {
        const token = await getToken();
        const res = await page.evaluate(
          async ({ apiURL, path, token }) => {
            // FormData must be built inside the browser context
            const r = await fetch(`${apiURL}${path}`, {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              // Note: browser sets Content-Type with boundary automatically
            });
            return r.json();
          },
          { apiURL, path, token }
        );
        return res as T;
      },
    };

    await use(client);
  },
});
