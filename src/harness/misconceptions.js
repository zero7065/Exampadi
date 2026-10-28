// src/harness/misconceptions.js
// Common student misconceptions per concept — used by AI Tutor to diagnose &
// explain, and by the learner loop to flag recurring wrong answers.
export const CONCEPT_MISCONCEPTIONS = {
  "PHY_JAMB_MEC_KIN_01": [
    { misconception: "Acceleration is velocity, not change of velocity.", explanation: "Acceleration = Δv / Δt. A body moving at constant speed has zero acceleration, not constant velocity." },
    { misconception: "Speed is a vector; velocity is scalar.", explanation: "Speed is distance/time (scalar). Velocity is displacement/time (vector). Acceleration is always a vector." },
    { misconception: "Formula v = d/t is always true.", explanation: "That is speed, not velocity when direction matters. Use v = s/t only for straight-line motion without direction." },
  ],
  "PHY_JAMB_MEC_DYN_01": [
    { misconception: "Force causes motion only linearly.", explanation: "Force can also cause rotation, deformation, or changes in direction — not just linear acceleration." },
    { misconception: "Mass resists motion via friction.", explanation: "Mass res inertia, resistance to *changes* in motion, not friction. Friction is a contact force; inertia is an intrinsic property." },
  ],
  "CHM_JAMB_ATM_MDL_01": [
    { misconception: "The nucleus contains protons and electrons.", explanation: "Protons live in the nucleus; electrons orbit in shells/layers around it. The nucleus holds the protons (+), not electrons." },
    { misconception: "Electrons are all negatively charged and same size.", explanation: "Electrons differ in energy levels (shells) and have negative charge, but their size (energy) varies across shells." },
  ],
  "MTH_JAMB_CAL_DIF_01": [
    { misconception: "Derivative means 'how fast'.", explanation: "Derivative = instantaneous rate of change (gradient of tangent). 'How fast' alone isn't enough — need rate of change of what?" },
    { misconception: "Differentiate only polynomials.", explanation: "Differentiate any continuous function: exponentials, logs, trig, implicit functions too. Product/chain rules apply universally." },
  ],
};

export function getConceptMisconceptions(conceptId) {
  return CONCEPT_MISCONCEPTIONS[conceptId] || [];
}
