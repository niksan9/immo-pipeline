import type { DealState } from "@dealpilot/core";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import {
  app,
  apiRequest,
  BASE_URL,
  closeDb,
  signin,
  signup,
  sql,
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

describe("onboarding: firstName/lastName on the session", () => {
  it("accepts firstName/lastName at sign-up and returns them on the session user", async () => {
    const email = uniqueEmail("onb");
    const res = await app.fetch(
      new Request(`${BASE_URL}/api/auth/sign-up/email`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email,
          password: "sup3rsecret!",
          name: "Ada Lovelace",
          firstName: "Ada",
          lastName: "Lovelace",
        }),
      }),
    );
    expect(res.status).toBe(200);
    const cookie = res.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");

    // better-auth surfaces additionalFields on getSession().user.
    const session = await app.fetch(
      new Request(`${BASE_URL}/api/auth/get-session`, {
        headers: { cookie },
      }),
    );
    expect(session.status).toBe(200);
    const body = (await session.json()) as {
      user: { firstName?: string; lastName?: string; email: string };
    };
    expect(body.user.firstName).toBe("Ada");
    expect(body.user.lastName).toBe("Lovelace");
    expect(body.user.email).toBe(email);
  });

  it("sign-up still succeeds when firstName/lastName are omitted (optional)", async () => {
    const email = uniqueEmail("onb-noname");
    const user = await signup(email);
    const session = await app.fetch(
      new Request(`${BASE_URL}/api/auth/get-session`, {
        headers: { cookie: user.cookie },
      }),
    );
    const body = (await session.json()) as {
      user: { firstName: string | null; lastName: string | null };
    };
    expect(body.user.firstName ?? null).toBeNull();
    expect(body.user.lastName ?? null).toBeNull();
  });
});

describe("consent", () => {
  const AGB_V1 = "agb-2026-01";
  const AGB_V2 = "agb-2026-07";
  const AI_V1 = "ai-2026-01";

  it("records AGB + KI-Hinweis together and GET returns the latest versions", async () => {
    const user = await signup(uniqueEmail("consent"));
    const post = await apiRequest("POST", "/api/consent", {
      cookie: user.cookie,
      body: {
        agb: { accepted: true, version: AGB_V1 },
        aiNotice: { accepted: true, version: AI_V1 },
      },
    });
    expect(post.status).toBe(200);
    expect((await post.json()) as { ok: boolean }).toEqual({ ok: true });

    const get = await apiRequest("GET", "/api/consent", { cookie: user.cookie });
    expect(get.status).toBe(200);
    const body = (await get.json()) as {
      agb: { version: string } | null;
      aiNotice: { version: string } | null;
    };
    expect(body.agb?.version).toBe(AGB_V1);
    expect(body.aiNotice?.version).toBe(AI_V1);

    // Two rows persisted (one per accepted block).
    const rows = await sql/* sql */ `
      SELECT kind, version FROM user_consent WHERE user_id = ${user.id}`;
    expect(rows).toHaveLength(2);
  });

  it("records blocks sent separately", async () => {
    const user = await signup(uniqueEmail("consent-sep"));
    const a = await apiRequest("POST", "/api/consent", {
      cookie: user.cookie,
      body: { agb: { accepted: true, version: AGB_V1 } },
    });
    expect(a.status).toBe(200);
    const b = await apiRequest("POST", "/api/consent", {
      cookie: user.cookie,
      body: { aiNotice: { accepted: true, version: AI_V1 } },
    });
    expect(b.status).toBe(200);

    const get = await apiRequest("GET", "/api/consent", { cookie: user.cookie });
    const body = (await get.json()) as {
      agb: { version: string } | null;
      aiNotice: { version: string } | null;
    };
    expect(body.agb?.version).toBe(AGB_V1);
    expect(body.aiNotice?.version).toBe(AI_V1);
  });

  it("appends history: a newer version is added and GET returns the newest", async () => {
    const user = await signup(uniqueEmail("consent-hist"));
    await apiRequest("POST", "/api/consent", {
      cookie: user.cookie,
      body: { agb: { accepted: true, version: AGB_V1 } },
    });
    // Ensure a later acceptedAt (defaultNow) so ordering is unambiguous.
    await new Promise((r) => setTimeout(r, 10));
    await apiRequest("POST", "/api/consent", {
      cookie: user.cookie,
      body: { agb: { accepted: true, version: AGB_V2 } },
    });

    const get = await apiRequest("GET", "/api/consent", { cookie: user.cookie });
    const body = (await get.json()) as { agb: { version: string } | null };
    expect(body.agb?.version).toBe(AGB_V2);

    // History is kept: both rows remain (append-only, no upsert).
    const rows = await sql/* sql */ `
      SELECT version FROM user_consent
      WHERE user_id = ${user.id} AND kind = 'agb'`;
    expect(rows).toHaveLength(2);
  });

  it("GET returns null for a kind with no consent yet", async () => {
    const user = await signup(uniqueEmail("consent-empty"));
    const get = await apiRequest("GET", "/api/consent", { cookie: user.cookie });
    const body = (await get.json()) as {
      agb: unknown;
      aiNotice: unknown;
    };
    expect(body.agb).toBeNull();
    expect(body.aiNotice).toBeNull();
  });

  it("rejects a block with accepted:false (400, nothing persisted)", async () => {
    const user = await signup(uniqueEmail("consent-reject"));
    const res = await apiRequest("POST", "/api/consent", {
      cookie: user.cookie,
      body: { agb: { accepted: false, version: AGB_V1 } },
    });
    expect(res.status).toBe(400);
    const rows = await sql/* sql */ `
      SELECT id FROM user_consent WHERE user_id = ${user.id}`;
    expect(rows).toHaveLength(0);
  });

  it("rejects a block missing a version (400)", async () => {
    const user = await signup(uniqueEmail("consent-nover"));
    const res = await apiRequest("POST", "/api/consent", {
      cookie: user.cookie,
      body: { aiNotice: { accepted: true } },
    });
    expect(res.status).toBe(400);
  });

  it("returns 401 for unauthenticated consent requests", async () => {
    const post = await apiRequest("POST", "/api/consent", {
      body: { agb: { accepted: true, version: AGB_V1 } },
    });
    expect(post.status).toBe(401);
    const get = await apiRequest("GET", "/api/consent");
    expect(get.status).toBe(401);
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

  it("re-inviting the same user is idempotent: one row, role updated", async () => {
    const owner = await signup(uniqueEmail("owner"));
    const collab = await signup(uniqueEmail("collab"));
    const created = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState(),
    });
    const id = ((await created.json()) as { deal: { id: string } }).deal.id;

    const first = await apiRequest("POST", `/api/deals/${id}/collaborators`, {
      cookie: owner.cookie,
      body: { email: collab.email, role: "viewer" },
    });
    expect(first.status).toBe(201);
    expect(
      ((await first.json()) as { collaborator: { role: string } }).collaborator
        .role,
    ).toBe("viewer");

    // Re-invite the same user with a different role.
    const second = await apiRequest("POST", `/api/deals/${id}/collaborators`, {
      cookie: owner.cookie,
      body: { email: collab.email, role: "editor" },
    });
    expect(second.status).toBe(201);
    expect(
      ((await second.json()) as { collaborator: { role: string } })
        .collaborator.role,
    ).toBe("editor");

    // Exactly one row exists for this (deal, user) pair, with the new role.
    const rows = await sql/* sql */ `
      SELECT role FROM deal_collaborators WHERE deal_id = ${id}`;
    expect(rows).toHaveLength(1);
    expect(rows[0]?.role).toBe("editor");

    // And the effective access reflects the updated role.
    const get = await apiRequest("GET", `/api/deals/${id}`, {
      cookie: collab.cookie,
    });
    expect(((await get.json()) as { role: string }).role).toBe("editor");
  });
});

describe("deep validation (malformed payloads → 400, not 500)", () => {
  // Each case is a deal body that would previously have crashed the handler.
  const cases: Array<[string, () => unknown]> = [
    ["non-string address", () => baseState({ address: 123 as never })],
    ["out-of-range kaufpreis (1e15)", () => baseState({ kaufpreis: 1e15 })],
    ["NaN kaufpreis", () => baseState({ kaufpreis: Number.NaN })],
    [
      "covered risk missing appliedCost",
      () => {
        const body = baseState() as unknown as { risks: unknown[] };
        body.risks = [
          { id: "r1", title: "Dach", status: "covered" }, // no appliedCost
        ];
        return body;
      },
    ],
  ];

  it("POST rejects each malformed body with 400", async () => {
    const owner = await signup(uniqueEmail());
    for (const [label, make] of cases) {
      const res = await apiRequest("POST", "/api/deals", {
        cookie: owner.cookie,
        body: make(),
      });
      expect(res.status, label).toBe(400);
    }
  });

  it("PUT rejects each malformed body with 400", async () => {
    const owner = await signup(uniqueEmail());
    const created = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState(),
    });
    const id = ((await created.json()) as { deal: { id: string } }).deal.id;
    for (const [label, make] of cases) {
      const res = await apiRequest("PUT", `/api/deals/${id}`, {
        cookie: owner.cookie,
        body: make(),
      });
      expect(res.status, label).toBe(400);
    }
  });
});

describe("idempotent deal creation (X-Idempotency-Key)", () => {
  it("replaying the same key returns the same deal (200, no duplicate)", async () => {
    const owner = await signup(uniqueEmail());
    const key = `local-deal-${Date.now()}`;

    const first = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      headers: { "X-Idempotency-Key": key },
      body: baseState(),
    });
    expect(first.status).toBe(201);
    const firstId = ((await first.json()) as { deal: { id: string } }).deal.id;

    const second = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      headers: { "X-Idempotency-Key": key },
      body: baseState({ ort: "Ignored On Replay" }),
    });
    expect(second.status).toBe(200);
    const secondId = ((await second.json()) as { deal: { id: string } }).deal
      .id;

    expect(secondId).toBe(firstId);

    // Only one row was created for this owner.
    const rows = await sql/* sql */ `
      SELECT id FROM deals WHERE owner_id = ${owner.id}`;
    expect(rows).toHaveLength(1);
  });

  it("POST without the header still creates (201) and does not dedupe", async () => {
    const owner = await signup(uniqueEmail());
    const a = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState(),
    });
    const b = await apiRequest("POST", "/api/deals", {
      cookie: owner.cookie,
      body: baseState(),
    });
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    const aId = ((await a.json()) as { deal: { id: string } }).deal.id;
    const bId = ((await b.json()) as { deal: { id: string } }).deal.id;
    expect(aId).not.toBe(bId);

    const rows = await sql/* sql */ `
      SELECT id FROM deals WHERE owner_id = ${owner.id}`;
    expect(rows).toHaveLength(2);
  });

  it("the same key for two different owners does not collide", async () => {
    const owner1 = await signup(uniqueEmail("o1"));
    const owner2 = await signup(uniqueEmail("o2"));
    const key = "shared-local-id";

    const r1 = await apiRequest("POST", "/api/deals", {
      cookie: owner1.cookie,
      headers: { "X-Idempotency-Key": key },
      body: baseState(),
    });
    const r2 = await apiRequest("POST", "/api/deals", {
      cookie: owner2.cookie,
      headers: { "X-Idempotency-Key": key },
      body: baseState(),
    });
    expect(r1.status).toBe(201);
    expect(r2.status).toBe(201);
    const id1 = ((await r1.json()) as { deal: { id: string } }).deal.id;
    const id2 = ((await r2.json()) as { deal: { id: string } }).deal.id;
    expect(id1).not.toBe(id2);
  });
});
