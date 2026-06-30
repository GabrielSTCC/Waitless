import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import {
  afterAll,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "vitest";

const PROJECT_ID = "waitless-rules-test";
const rules = readFileSync(resolve(process.cwd(), "firestore.rules"), "utf8");

let testEnv: RulesTestEnvironment;

function authed(uid: string, email?: string) {
  return testEnv.authenticatedContext(uid, {
    email: email ?? `${uid}@example.com`,
  });
}

function memberCreatePayload(companyId: string, email: string, role: string) {
  return { companyId, email, role };
}

async function seedCompany(ownerId: string, companyId = "cafe-test") {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "companies", companyId), {
      name: "Cafe Test",
      ownerId,
    });
  });
}

async function seedMember(
  userId: string,
  companyId: string,
  role: string,
  email?: string,
) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "members", userId), {
      companyId,
      email: email ?? `${userId}@example.com`,
      role,
    });
  });
}

describe("firestore.rules", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: { rules },
    });
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  it("denies owner signup without app check (onboarding uses server API)", async () => {
    const owner = authed("owner-new", "owner@example.com");
    const db = owner.firestore();

    await assertFails(
      setDoc(doc(db, "companies", "barbearia-nova"), {
        name: "Barbearia Nova",
        ownerId: "owner-new",
      }),
    );

    await assertFails(
      setDoc(doc(db, "members", "owner-new"), {
        companyId: "barbearia-nova",
        email: "owner@example.com",
        role: "owner",
      }),
    );
  });

  it("denies read of existing company for non-members", async () => {
    await seedCompany("owner-1", "barbearia-power");

    const outsider = authed("outsider-1", "outsider-1@example.com");
    await assertFails(getDoc(doc(outsider.firestore(), "companies", "barbearia-power")));
  });

  it("denies member create with foreign companyId", async () => {
    await seedCompany("owner-1", "victim-co");

    const attacker = authed("attacker-1");
    const db = attacker.firestore();

    await assertFails(
      setDoc(doc(db, "members", "attacker-1"), {
        companyId: "victim-co",
        email: "attacker-1@example.com",
        role: "admin",
      }),
    );
  });

  it("denies member create with admin role", async () => {
    await seedCompany("owner-1", "my-co");

    const attacker = authed("attacker-1");
    const db = attacker.firestore();

    await assertFails(
      setDoc(doc(db, "members", "attacker-1"), memberCreatePayload(
        "my-co",
        "attacker-1@example.com",
        "admin",
      )),
    );
  });

  it("denies member create when user is not company owner", async () => {
    await seedCompany("owner-1", "my-co");

    const impostor = authed("impostor-1", "impostor-1@example.com");
    const db = impostor.firestore();

    await assertFails(
      setDoc(doc(db, "members", "impostor-1"), memberCreatePayload(
        "my-co",
        "impostor-1@example.com",
        "owner",
      )),
    );
  });

  it("denies public invite read", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "invites", "invite-1"), {
        companyId: "my-co",
        email: "guest@example.com",
        role: "base",
        used: false,
      });
    });

    const anon = testEnv.unauthenticatedContext();
    await assertFails(getDoc(doc(anon.firestore(), "invites", "invite-1")));
  });

  it("denies invite read for authenticated user with different email", async () => {
    await seedCompany("owner-1", "my-co");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "invites", "invite-1"), {
        companyId: "my-co",
        email: "guest@example.com",
        role: "base",
        used: false,
      });
    });

    const other = authed("other-1", "other@example.com");
    await assertFails(getDoc(doc(other.firestore(), "invites", "invite-1")));
  });

  it("denies marking invite as used by non-manager", async () => {
    await seedCompany("owner-1", "my-co");
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "invites", "invite-1"), {
        companyId: "my-co",
        email: "guest@example.com",
        role: "base",
        used: false,
      });
    });

    const guest = authed("guest-1", "guest@example.com");
    await assertFails(
      updateDoc(doc(guest.firestore(), "invites", "invite-1"), { used: true }),
    );
  });

  it("denies queue create when signup trial expired", async () => {
    const past = new Date(Date.now() - 86_400_000);
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, "companies", "trial-expired"), {
        name: "Trial Expired Co",
        ownerId: "owner-1",
        subscription: {
          status: "trialing",
          planId: "free",
          trialEndsAt: Timestamp.fromDate(past),
        },
      });
    });
    await seedMember("owner-1", "trial-expired", "owner");

    const owner = authed("owner-1", "owner-1@example.com");
    const db = owner.firestore();

    await assertFails(
      setDoc(doc(db, "companies", "trial-expired", "queue", "entry-1"), {
        clientId: "c1",
        clientName: "Cliente",
        status: "waiting",
        position: 1,
      }),
    );
  });

  it("denies client writes to meta/billing", async () => {
    await seedCompany("owner-1", "my-co");
    await seedMember("owner-1", "my-co", "owner");

    const owner = authed("owner-1", "owner-1@example.com");
    const db = owner.firestore();

    await assertFails(
      setDoc(doc(db, "companies", "my-co", "meta", "billing"), {
        monthKey: "2099-01",
        completedCount: 0,
      }),
    );

    await testEnv.withSecurityRulesDisabled(async (context) => {
      const adminDb = context.firestore();
      await setDoc(doc(adminDb, "companies", "my-co", "meta", "billing"), {
        monthKey: "2026-06",
        completedCount: 2,
      });
    });

    await assertFails(
      updateDoc(doc(db, "companies", "my-co", "meta", "billing"), {
        monthKey: "2099-01",
        completedCount: 1,
      }),
    );
  });
});
