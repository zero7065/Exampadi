// src/harness/transferBank.js
// Transfer rules: which mastered concepts unlock practice on later topics.
// Deterministic AI behavior: progression gated strictly by prerequisite chain.
export const TRANSFER_RULES = [
  { from: "PHY_JAMB_MEC_KIN_01", to: "PHY_JAMB_MEC_DYN_01", desc: "Kinematics → Dynamics" },
  { from: "PHY_JAMB_MEC_DYN_01", to: "PHY_JAMB_MEC_WEP_01", desc: "Dynamics → Work Energy" },
  { from: "MTH_JAMB_ALG_IND_01", to: "MTH_JAMB_ALG_POL_01", desc: "Indices → Polynomials" },
  { from: "MTH_JAMB_ALG_POL_01", to: "MTH_JAMB_ALG_SIM_01", desc: "Polynomials → Simultaneous Equations" },
  { from: "MTH_JAMB_CAL_DIF_01", to: "MTH_JAMB_CAL_INT_01", desc: "Differentiation → Integration" },
  { from: "BIO_JAMB_CEL_STR_01", to: "BIO_JAMB_CEL_DIV_01", desc: "Cell Structure → Cell Division" },
];

export function isTransferable(fromConceptId, toConceptId) {
  const rule = TRANSFER_RULES.find((r) => r.from === fromConceptId && r.to === toConceptId);
  return !!rule;
}

export function unlockedTransfers({ mastered = [], failed = [] } = {}) {
  return TRANSFER_RULES.filter(
    (r) => !mastered.includes(r.from) && !failed.includes(r.from) && !mastered.includes(r.to)
  );
}
