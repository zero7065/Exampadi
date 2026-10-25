const CACHE_DAYS = 30;

export async function checkCache(db, promptHash) {
  try {
    const ref = db.collection("aiCache").doc(promptHash);
    const snap = await ref.get();
    if (!snap.exists) return null;
    const data = snap.data() || {};
    const expiresAt = data.expiresAt?.toMillis?.() || 0;
    if (expiresAt && expiresAt < Date.now()) {
      ref.delete().catch(() => {});
      return null;
    }
    if (!data.response?.choices?.length) return null;
    ref.set({
      hitCount: (Number(data.hitCount) || 0) + 1,
      lastHitAt: new Date(),
    }, { merge: true }).catch(() => {});
    return data;
  } catch {
    return null;
  }
}

export async function writeCache(db, promptHash, { promptPreview, response, modelUsed, provider }) {
  try {
    if (!response?.choices?.length) return;
    const expiresAt = new Date(Date.now() + CACHE_DAYS * 24 * 60 * 60 * 1000);
    await db.collection("aiCache").doc(promptHash).set({
      promptHash,
      promptPreview: String(promptPreview || "").slice(0, 120),
      response,
      provider: provider || null,
      modelUsed: modelUsed || null,
      createdAt: new Date(),
      expiresAt,
      updatedAt: new Date(),
    }, { merge: true });
  } catch {
    return;
  }
}
