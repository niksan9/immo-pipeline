import type { DealState } from "@dealpilot/core";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  app,
  apiRequest,
  BASE_URL,
  closeDb,
  signin,
  signup,
  truncateAll,
} from "./helpers.js";

/** A valid DealState for request bodies (mirrors core's baseState fixture). */
function baseState(overrides: Partial<DealState["deal"]> = {}): DealState {
  return {
    deal: {
      objektart: "ETW",
      address: "Musterstraße 1",
      plz: "04109",
      ort: "Leipzig",
      qm: 70,
      baujahr: 1998,
      kaufpreis: 200000,
      rent: 1000,
      vermietet: "vermietet",
      dealStatus: "pruefung",
      ...overrides,
    },
    priceByCase: { base: 200000, bull: 200000, bear: 200000 },
    scenario: "base",
    financing: { zins: 4.0, tilg: 2.0, ek: 50000, maklerPct: 0.0357 },
    costs: { hausgeld: 100, ruecklage: 50, verwaltung: 30 },
    costGrowth: 2.0,
    wertZuwachs: 2.0,
    steig: 2.0,
    gebaeudewert: 150000,
    afaSatz: 2.0,
    steuersatz: 42,
    measures: [],
    risks: [],
    collaborators: [],
    contact: { name: "Martina Krause", role: "Maklerin" },
  };
}

let userCounter = 0;
function uniqueEmail(prefix = "user"): string {
  userCounter += 1;
  return `${prefix}-${Date.now()}-${userCounter}@example.com`;
}

beforeEach(async () => {
  await truncateAll();
});

afterAll(async () => {
  await closeDb();
});

describe("auth", () => {
  it("signs up a user and issues a working session cookie", async () => {
    const email = uniqueEmail();
    const user = await signup(email);
    expect(user.id).toBeTruthy();
    expect(user.cookie).toContain("session");

    // The cookie authenticates a protected route.
    const res = await apiRequest("GET", "/api/deals", { cookie: user.cookie });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { deals: unknown[] };
    expect(body.deals).toEqual([]);
  });

  it("signs in an existing user (fresh cookie authenticates)", async () => {
    const email = uniqueEmail();
    await signup(email, "hunter2hunter2");
    const cookie = await signin(email, "hunter2hunter2");
    expect(cookie).toContain("session");
    const res = await apiRequest("GET", "/api/deals", { cookie });
    expect(res.status).toBe(200);
  });

  it("rejects wrong-password sign in", async () => {
    const email = uniqueEmail();
    await signup(email, "correct-horse");
    await expect(signin(email, "wrong-password")).rejects.toThrow();
  });
});

describe("expo plugin", () => {
  // The Expo client sends its app scheme as an `expo-origin` header (there is
  // no browser `origin` on a native request). The expo() server plugin copies
  // it onto `origin`, which better-auth then checks against trustedOrigins.
  it("accepts a sign-up carrying the trusted app-scheme expo-origin", async () => {
    const email = uniqueEmail("expo");
    const res = await app.fetch(
      new Request(`${BASE_URL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "expo-origin": "dealpilot://",
        },
        body: JSON.stringify({
          email,
          password: "sup3rsecret!",
          name: "Expo User",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { user?: { id?: string } };
    expect(body.user?.id).toBeTruthy();
  });
});

describe("auth guard", () => {
  it("returns 401 for unauthenticated requests", async () => {
    for (const [method, path] of [
      ["GET", "/api/deals"],
      ["POST", "/api/deals"],
      ["GET", "/api/deals/00000000-0000-0000-0000-000000000000"],
    ] as const) {
      const res = await apiRequest(method, path, {
        body: method === "POST" ? baseState() : undefined,
      });
      expect(res.status).toBe(401);
    }
  });
});

describe("deal CRUD (happy paths)", () => {
  it("creates a deal, extracting denormalized fields", async () => {
    const owner = await signup(uniqueEmail());
    const res = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState(),
    });
    expect(res.status).toBe(201);
    const { deal } = (await res.json()) as { deal: Record<string, unknown> };
    expect(deal.id).toBeTruthy();
    expect(deal.ownerId).toBe(owner.id);
    expect(deal.dealStatus).toBe("pruefung");
    expect(deal.title).toBe("Musterstraße 1");
    expect(deal.ort).toBe("Leipzig");
    expect(deal.kaufpreis).toBe(200000);
    // score comes from core computeScore (no risks -> baseline 74).
    expect(deal.score).toBe(74);
    // full state round-trips in jsonb
    expect((deal.state as DealState).financing.zins).toBe(4.0);
  });

  it("derives title from objektart+ort when address is absent", async () => {
    const owner = await signup(uniqueEmail());
    const body = baseState({ address: undefined });
    const res = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body,
    });
    const { deal } = (await res.json()) as { deal: Record<string, unknown> };
    expect(deal.title).toBe("ETW · Leipzig");
  });

  it("rejects an invalid deal body with 400", async () => {
    const owner = await signup(uniqueEmail());
    const res = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: { not: "a deal" },
    });
    expect(res.status).toBe(400);
  });

  it("lists only denormalized fields for owned deals", async () => {
    const owner = await signup(uniqueEmail());
    await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState(),
    });
    await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState({ ort: "Berlin", address: "Zweite Str. 2" }),
    });
    const res = await apiRequest("GET", "/api/deals", { cookie: owner.cookie });
    const { deals } = (await res.json()) as {
      deals: Array<Record<string, unknown>>;
    };
    expect(deals).toHaveLength(2);
    // listing rows carry denormalized columns, not the full state blob
    for (const row of deals) {
      expect(row).not.toHaveProperty("state");
      expect(row).toHaveProperty("title");
      expect(row).toHaveProperty("score");
    }
    expect(deals.map((d) => d.ort).sort()).toEqual(["Berlin", "Leipzig"]);
  });

  it("returns full state on GET /:id", async () => {
    const owner = await signup(uniqueEmail());
    const created = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState(),
    });
    const id = ((await created.json()) as { deal: { id: string } }).deal.id;

    const res = await apiRequest("GET", `/api/deals/${id}`, {
      cookie: owner.cookie,
    });
    expect(res.status).toBe(200);
    const { deal, role } = (await res.json()) as {
      deal: { state: DealState };
      role: string;
    };
    expect(role).toBe("owner");
    expect(deal.state.deal.ort).toBe("Leipzig");
  });

  it("updates state and re-extracts denormalized fields + updatedAt", async () => {
    const owner = await signup(uniqueEmail());
    const created = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState(),
    });
    const createdDeal = ((await created.json()) as {
      deal: { id: string; updatedAt: string };
    }).deal;

    const updated = baseState({
      ort: "Dresden",
      address: "Neue Gasse 9",
      kaufpreis: 250000,
      dealStatus: "verhandlung",
    });
    const res = await apiRequest("PUT", `/api/deals/${createdDeal.id}`, {
      cookie: owner.cookie,
      body: updated,
    });
    expect(res.status).toBe(200);
    const { deal } = (await res.json()) as { deal: Record<string, unknown> };
    expect(deal.title).toBe("Neue Gasse 9");
    expect(deal.ort).toBe("Dresden");
    expect(deal.kaufpreis).toBe(250000);
    expect(deal.dealStatus).toBe("verhandlung");
    expect(
      new Date(deal.updatedAt as string).getTime(),
    ).toBeGreaterThanOrEqual(new Date(createdDeal.updatedAt).getTime());
  });

  it("deletes a deal (owner)", async () => {
    const owner = await signup(uniqueEmail());
    const created = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState(),
    });
    const id = ((await created.json()) as { deal: { id: string } }).deal.id;

    const del = await apiRequest("DELETE", `/api/deals/${id}`, {
      cookie: owner.cookie,
    });
    expect(del.status).toBe(200);
    const get = await apiRequest("GET", `/api/deals/${id}`, {
      cookie: owner.cookie,
    });
    expect(get.status).toBe(404);
  });
});

describe("not found", () => {
  it("returns 404 for a non-existent deal id", async () => {
    const owner = await signup(uniqueEmail());
    const res = await apiRequest(
      "GET",
      "/api/deals/11111111-1111-1111-1111-111111111111",
      { cookie: owner.cookie },
    );
    expect(res.status).toBe(404);
  });

  it("returns 404 for a malformed deal id", async () => {
    const owner = await signup(uniqueEmail());
    const res = await apiRequest("GET", "/api/deals/not-a-uuid", {
      cookie: owner.cookie,
    });
    expect(res.status).toBe(404);
  });
});

describe("owner scoping", () => {
  async function ownedDeal() {
    const owner = await signup(uniqueEmail("owner"));
    const created = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState(),
    });
    const id = ((await created.json()) as { deal: { id: string } }).deal.id;
    return { owner, id };
  }

  it("hides another user's deal from GET (404)", async () => {
    const { id } = await ownedDeal();
    const other = await signup(uniqueEmail("other"));
    const res = await apiRequest("GET", `/api/deals/${id}`, {
      cookie: other.cookie,
    });
    expect(res.status).toBe(404);
  });

  it("blocks another user's PUT (404)", async () => {
    const { id } = await ownedDeal();
    const other = await signup(uniqueEmail("other"));
    const res = await apiRequest("PUT", `/api/deals/${id}`, {
      cookie: other.cookie,
      body: baseState({ ort: "Hacked" }),
    });
    expect(res.status).toBe(404);
  });

  it("blocks another user's DELETE (404)", async () => {
    const { id } = await ownedDeal();
    const other = await signup(uniqueEmail("other"));
    const res = await apiRequest("DELETE", `/api/deals/${id}`, {
      cookie: other.cookie,
    });
    expect(res.status).toBe(404);
  });

  it("excludes another user's deal from the list", async () => {
    await ownedDeal();
    const other = await signup(uniqueEmail("other"));
    const res = await apiRequest("GET", "/api/deals", { cookie: other.cookie });
    const { deals } = (await res.json()) as { deals: unknown[] };
    expect(deals).toEqual([]);
  });
});

describe("collaborators", () => {
  async function setup(role: "editor" | "viewer") {
    const owner = await signup(uniqueEmail("owner"));
    const collab = await signup(uniqueEmail("collab"));
    const created = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState(),
    });
    const id = ((await created.json()) as { deal: { id: string } }).deal.id;
    const invite = await apiRequest("POST", `/api/deals/${id}/collaborators`, {
      cookie: owner.cookie,
      body: { email: collab.email, role },
    });
    expect(invite.status).toBe(201);
    return { owner, collab, id };
  }

  it("only the owner can invite (collaborator invite attempt -> 404/403)", async () => {
    const owner = await signup(uniqueEmail("owner"));
    const stranger = await signup(uniqueEmail("stranger"));
    const created = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState(),
    });
    const id = ((await created.json()) as { deal: { id: string } }).deal.id;
    // stranger has no access at all -> 404
    const res = await apiRequest("POST", `/api/deals/${id}/collaborators`, {
      cookie: stranger.cookie,
      body: { email: stranger.email, role: "editor" },
    });
    expect(res.status).toBe(404);
  });

  it("invite fails with 404 when the invited email has no account", async () => {
    const owner = await signup(uniqueEmail("owner"));
    const created = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState(),
    });
    const id = ((await created.json()) as { deal: { id: string } }).deal.id;
    const res = await apiRequest("POST", `/api/deals/${id}/collaborators`, {
      cookie: owner.cookie,
      body: { email: "ghost@example.com", role: "editor" },
    });
    expect(res.status).toBe(404);
  });

  it("editor can GET and PUT but not DELETE (403)", async () => {
    const { collab, id } = await setup("editor");

    const get = await apiRequest("GET", `/api/deals/${id}`, {
      cookie: collab.cookie,
    });
    expect(get.status).toBe(200);
    expect(((await get.json()) as { role: string }).role).toBe("editor");

    const put = await apiRequest("PUT", `/api/deals/${id}`, {
      cookie: collab.cookie,
      body: baseState({ ort: "Hamburg" }),
    });
    expect(put.status).toBe(200);
    expect(((await put.json()) as { deal: { ort: string } }).deal.ort).toBe(
      "Hamburg",
    );

    const del = await apiRequest("DELETE", `/api/deals/${id}`, {
      cookie: collab.cookie,
    });
    expect(del.status).toBe(403);
  });

  it("viewer can GET only (PUT 403, DELETE 403)", async () => {
    const { collab, id } = await setup("viewer");

    const get = await apiRequest("GET", `/api/deals/${id}`, {
      cookie: collab.cookie,
    });
    expect(get.status).toBe(200);
    expect(((await get.json()) as { role: string }).role).toBe("viewer");

    const put = await apiRequest("PUT", `/api/deals/${id}`, {
      cookie: collab.cookie,
      body: baseState({ ort: "Nope" }),
    });
    expect(put.status).toBe(403);

    const del = await apiRequest("DELETE", `/api/deals/${id}`, {
      cookie: collab.cookie,
    });
    expect(del.status).toBe(403);
  });

  it("collaborator's deals list includes shared deals", async () => {
    const { collab, id } = await setup("viewer");
    const res = await apiRequest("GET", "/api/deals", {
      cookie: collab.cookie,
    });
    const { deals } = (await res.json()) as { deals: Array<{ id: string }> };
    expect(deals.map((d) => d.id)).toContain(id);
  });

  it("owner can remove a collaborator (access revoked)", async () => {
    const { owner, collab, id } = await setup("editor");
    const del = await apiRequest("DELETE", `/api/deals/${id}/collaborators`, {
      cookie: owner.cookie,
      body: { email: collab.email },
    });
    expect(del.status).toBe(200);
    const get = await apiRequest("GET", `/api/deals/${id}`, {
      cookie: collab.cookie,
    });
    expect(get.status).toBe(404);
  });
});
