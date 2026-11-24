import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { ensureDb } from "@/lib/firebase/config";
import { mapClient } from "@/lib/firebase/mappers";
import { normalizeName, normalizeWhatsapp } from "@/lib/utils/format";
import type { Client } from "@/lib/types";

export async function searchClients(
  companyId: string,
  term: string,
  max = 8,
): Promise<Client[]> {
  const trimmed = term.trim();
  if (trimmed.length < 2) return [];

  const clientsRef = collection((await ensureDb()), "companies", companyId, "clients");
  const digits = normalizeWhatsapp(trimmed);

  if (digits.length >= 2) {
    const end =
      digits.slice(0, -1) +
      String.fromCodePoint((digits.codePointAt(digits.length - 1) ?? 0) + 1);
    const snap = await getDocs(
      query(
        clientsRef,
        where("normalizedWhatsapp", ">=", digits),
        where("normalizedWhatsapp", "<", end),
        limit(max),
      ),
    );
    if (!snap.empty) return snap.docs.map(mapClient);
  }

  const normalized = normalizeName(trimmed);
  const endName =
    normalized.slice(0, -1) +
    String.fromCodePoint((normalized.codePointAt(normalized.length - 1) ?? 0) + 1);

  const nameSnap = await getDocs(
    query(
      clientsRef,
      where("normalizedName", ">=", normalized),
      where("normalizedName", "<", endName),
      limit(max),
    ),
  );

  return nameSnap.docs.map(mapClient);
}

export async function listClients(
  companyId: string,
  max = 50,
): Promise<Client[]> {
  const clientsRef = collection((await ensureDb()), "companies", companyId, "clients");

  try {
    const snap = await getDocs(
      query(clientsRef, orderBy("lastVisitAt", "desc"), limit(max)),
    );
    return snap.docs.map(mapClient);
  } catch {
    const snap = await getDocs(query(clientsRef, limit(max)));
    return snap.docs
      .map(mapClient)
      .sort((a, b) => b.lastVisitAt.getTime() - a.lastVisitAt.getTime())
      .slice(0, max);
  }
}

export async function getClientsCount(companyId: string): Promise<number> {
  const snap = await getDocs(
    query(collection((await ensureDb()), "companies", companyId, "clients"), limit(1000)),
  );
  return snap.size;
}
