// src/harness/realLife.js
// Real-life analogies per concept — used by AI Tutor for "explain like you're 10".
export const CONCEPT_ANALOGIES = {
  "PHY_JAMB_MEC_KIN_01": [
    { analogy: "Count your steps as you walk a path.", context: "Distance — how much path you cover, like reading page numbers in a book." },
    { analogy: "Stairs vs escalator.", context: "Displacement is start→end straight line; distance is every step you actually took." },
  ],
  "PHY_JAMB_MEC_DYN_01": [
    { analogy: "Push a stuck car vs push an empty chair.", context: "Force = what makes things move; a heavier car needs harder push to start." },
  ],
  "CHM_JAMB_ATM_MDL_01": [
    { analogy: "Solar system: sun = nucleus, planets = electrons.", context: "Protons are central (+), electrons orbit around them on paths." },
  ],
  "MTH_JAMB_CAL_DIF_01": [
    { analogy: "Speedometer vs odometer.", context: "Derivative = speedometer reading (instant rate); function value = odometer total." },
  ],
};

export function getAnalogies(conceptId) {
  return CONCEPT_ANALOGIES[conceptId] || [];
}
