// src/harness/subjects.js
// Subject → examType → topic → subtopic → conceptId → prerequisiteConceptIds
export const SUBJECT_HIERARCHY = {
  "Physics": {
    "JAMB": {
      "Mechanics": {
        "Kinematics": { "conceptId": "PHY_JAMB_MEC_KIN_01", "prereqs": [] },
        "Dynamics": { "conceptId": "PHY_JAMB_MEC_DYN_01", "prereqs": ["PHY_JAMB_MEC_KIN_01"] },
        "Work, Energy, Power": { "conceptId": "PHY_JAMB_MEC_WEP_01", "prereqs": ["PHY_JAMB_MEC_DYN_01"] },
        "Momentum & Collisions": { "conceptId": "PHY_JAMB_MEC_MOM_01", "prereqs": ["PHY_JAMB_MEC_DYN_01"] },
        "Circular Motion": { "conceptId": "PHY_JAMB_MEC_CIR_01", "prereqs": ["PHY_JAMB_MEC_DYN_01"] }
      },
      "Thermodynamics": {
        "Heat & Temperature": { "conceptId": "PHY_JAMB_THM_HTP_01", "prereqs": [] },
        "Gas Laws": { "conceptId": "PHY_JAMB_THM_GAS_01", "prereqs": ["PHY_JAMB_THM_HTP_01"] },
        "First Law": { "conceptId": "PHY_JAMB_THM_FST_01", "prereqs": ["PHY_JAMB_THM_GAS_01"] }
      },
      "Waves & Optics": {
        "Wave Properties": { "conceptId": "PHY_JAMB_WAV_WPR_01", "prereqs": [] },
        "Sound": { "conceptId": "PHY_JAMB_WAV_SND_01", "prereqs": ["PHY_JAMB_WAV_WPR_01"] },
        "Light & Optics": { "conceptId": "PHY_JAMB_WAV_LGT_01", "prereqs": ["PHY_JAMB_WAV_WPR_01"] }
      },
      "Electricity & Magnetism": {
        "Electrostatics": { "conceptId": "PHY_JAMB_ELE_ELS_01", "prereqs": [] },
        "Current Electricity": { "conceptId": "PHY_JAMB_ELE_CUR_01", "prereqs": ["PHY_JAMB_ELE_ELS_01"] },
        "Magnetic Fields": { "conceptId": "PHY_JAMB_ELE_MAG_01", "prereqs": ["PHY_JAMB_ELE_CUR_01"] },
        "Electromagnetic Induction": { "conceptId": "PHY_JAMB_ELE_EMI_01", "prereqs": ["PHY_JAMB_ELE_MAG_01"] }
      },
      "Modern Physics": {
        "Quantum Physics": { "conceptId": "PHY_JAMB_MOD_QNT_01", "prereqs": [] },
        "Nuclear Physics": { "conceptId": "PHY_JAMB_MOD_NUC_01", "prereqs": ["PHY_JAMB_MOD_QNT_01"] }
      }
    },
    "WAEC": { /* similar structure */ },
    "NECO": { /* similar structure */ }
  },
  "Chemistry": {
    "JAMB": {
      "Atomic Structure": {
        "Models of the Atom": { "conceptId": "CHM_JAMB_ATM_MDL_01", "prereqs": [] },
        "Electronic Configuration": { "conceptId": "CHM_JAMB_ATM_ELC_01", "prereqs": ["CHM_JAMB_ATM_MDL_01"] }
      },
      "Periodic Table": {
        "Periodic Trends": { "conceptId": "CHM_JAMB_PER_TRD_01", "prereqs": ["CHM_JAMB_ATM_ELC_01"] },
        "Group Properties": { "conceptId": "CHM_JAMB_PER_GRP_01", "prereqs": ["CHM_JAMB_PER_TRD_01"] }
      },
      "Chemical Bonding": {
        "Ionic Bonding": { "conceptId": "CHM_JAMB_BND_ION_01", "prereqs": ["CHM_JAMB_PER_TRD_01"] },
        "Covalent Bonding": { "conceptId": "CHM_JAMB_BND_COV_01", "prereqs": ["CHM_JAMB_PER_TRD_01"] },
        "Metallic Bonding": { "conceptId": "CHM_JAMB_BND_MET_01", "prereqs": ["CHM_JAMB_BND_COV_01"] }
      },
      "States of Matter": {
        "Kinetic Theory": { "conceptId": "CHM_JAMB_STM_KIN_01", "prereqs": [] },
        "Gas Laws": { "conceptId": "CHM_JAMB_STM_GAS_01", "prereqs": ["CHM_JAMB_STM_KIN_01"] }
      },
      "Chemical Kinetics": {
        "Rate Laws": { "conceptId": "CHM_JAMB_KIN_RLW_01", "prereqs": ["CHM_JAMB_STM_GAS_01"] },
        "Activation Energy": { "conceptId": "CHM_JAMB_KIN_ACT_01", "prereqs": ["CHM_JAMB_KIN_RLW_01"] }
      },
      "Organic Chemistry": {
        "Alkanes": { "conceptId": "CHM_JAMB_ORG_ALK_01", "prereqs": ["CHM_JAMB_BND_COV_01"] },
        "Alkenes": { "conceptId": "CHM_JAMB_ORG_ALKEN_01", "prereqs": ["CHM_JAMB_ORG_ALK_01"] },
        "Functional Groups": { "conceptId": "CHM_JAMB_ORG_FUN_01", "prereqs": ["CHM_JAMB_ORG_ALKEN_01"] }
      }
    }
  },
  "Biology": {
    "JAMB": {
      "Cell Biology": {
        "Cell Structure": { "conceptId": "BIO_JAMB_CEL_STR_01", "prereqs": [] },
        "Cell Division": { "conceptId": "BIO_JAMB_CEL_DIV_01", "prereqs": ["BIO_JAMB_CEL_STR_01"] },
        "Transport Across Membranes": { "conceptId": "BIO_JAMB_CEL_TRN_01", "prereqs": ["BIO_JAMB_CEL_STR_01"] }
      },
      "Genetics": {
        "Mendelian Genetics": { "conceptId": "BIO_JAMB_GEN_MEN_01", "prereqs": ["BIO_JAMB_CEL_DIV_01"] },
        "Molecular Genetics": { "conceptId": "BIO_JAMB_GEN_MOL_01", "prereqs": ["BIO_JAMB_GEN_MEN_01"] }
      },
      "Ecology": {
        "Ecosystems": { "conceptId": "BIO_JAMB_ECO_ECO_01", "prereqs": [] },
        "Population Ecology": { "conceptId": "BIO_JAMB_ECO_POP_01", "prereqs": ["BIO_JAMB_ECO_ECO_01"] }
      }
    }
  },
  "Mathematics": {
    "JAMB": {
      "Algebra": {
        "Indices & Logarithms": { "conceptId": "MTH_JAMB_ALG_IND_01", "prereqs": [] },
        "Polynomials": { "conceptId": "MTH_JAMB_ALG_POL_01", "prereqs": ["MTH_JAMB_ALG_IND_01"] },
        "Simultaneous Equations": { "conceptId": "MTH_JAMB_ALG_SIM_01", "prereqs": ["MTH_JAMB_ALG_POL_01"] }
      },
      "Calculus": {
        "Differentiation": { "conceptId": "MTH_JAMB_CAL_DIF_01", "prereqs": ["MTH_JAMB_ALG_POL_01"] },
        "Integration": { "conceptId": "MTH_JAMB_CAL_INT_01", "prereqs": ["MTH_JAMB_CAL_DIF_01"] }
      },
      "Geometry & Trigonometry": {
        "Plane Geometry": { "conceptId": "MTH_JAMB_GEO_PLN_01", "prereqs": [] },
        "Trigonometric Ratios": { "conceptId": "MTH_JAMB_GEO_TRG_01", "prereqs": ["MTH_JAMB_GEO_PLN_01"] }
      }
    }
  },
  "English": {
    "JAMB": {
      "Comprehension": { "conceptId": "ENG_JAMB_CMP_01", "prereqs": [] },
      "Lexis & Structure": { "conceptId": "ENG_JAMB_LEX_01", "prereqs": [] },
      "Oral English": { "conceptId": "ENG_JAMB_ORL_01", "prereqs": [] }
    }
  }
};

export function getConcept(conceptId) {
  for (const [subject, exams] of Object.entries(SUBJECT_HIERARCHY)) {
    for (const [exam, topics] of Object.entries(exams)) {
      for (const [topic, subtopics] of Object.entries(topics)) {
        for (const [subtopic, data] of Object.entries(subtopics)) {
          if (data.conceptId === conceptId) {
            return { subject, exam, topic, subtopic, ...data };
          }
        }
      }
    }
  }
  return null;
}

export function getPrerequisites(conceptId) {
  const c = getConcept(conceptId);
  return c?.prereqs || [];
}