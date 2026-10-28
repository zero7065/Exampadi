// src/harness/offline.js
// Offline fallback content so students can still study when AI / network is down.
// These are deterministic template completions keyed by conceptId.
const FALLBACK_EXPLANATIONS = {
  "PHY_JAMB_MEC_KIN_01": "Kinematics describes motion without worrying about forces. Distance is total path covered; displacement is straight line from start to end. Speed = distance/time; velocity = displacement/time; acceleration = change in velocity/time.",
  "PHY_JAMB_MEC_DYN_01": "Dynamics: Forces cause motion. Newton's First Law — an object stays still or keeps moving unless an external force acts on it. Force = mass × acceleration (F=ma).",
  "CHM_JAMB_ATM_MDL_01": "Atomic structure: Protons (+) and neutrons are in the nucleus; electrons (-) orbit around it. The nucleus is tiny but holds most of the mass.",
  "MTH_JAMB_CAL_DIF_01": "Differentiation finds the instantaneous rate of change (gradient of the tangent). If y = x^n, dy/dx = n*x^(n-1).",
  "DEFAULT": "Concept explanation not available offline. Please reconnect and retry, or check your textbook/workbook.",
};

export function getOfflineExplanation(conceptId) {
  return FALLBACK_EXPLANATIONS[conceptId] || FALLBACK_EXPLANATIONS.DEFAULT;
}

export function getOfflineReply(subject, topic) {
  return `Offline mode — ${subject}: ${topic}. Core idea: ${FALLBACK_EXPLANATIONS.DEFAULT}. Reconnect to get AI tutoring.`;
}

export function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}
