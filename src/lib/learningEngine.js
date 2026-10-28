// src/lib/learningEngine.js
// Deterministic AI behavior contract: patterns → interventions → responses.
// Zero external API calls. Pure functions + optional Firestore integration
// (see src/lib/presence.js and src/harness for data models).

import {
  analyzeLearning,
  detectPatterns,
  prescribeCountermeasure,
} from "./learningLoop";
import {
  getConceptMisconceptions,
} from "../harness/misconceptions";
import {
  getAnalogies,
} from "../harness/realLife";
import {
  checkAnswerAllowed,
  applyPromptGuardrails,
} from "../harness/guardrails";
import {
  getOfflineExplanation,
  isOffline,
} from "../harness/offline";
import { CONCEPT_MISCONCEPTIONS } from "../harness/misconceptions";

// — State Enums —
export const SESSION_STATE = {
  STARTING: "starting",          // just entered the session
  ACTIVE: "active",             // working on questions
  COOLDOWN: "cooldown",         // taking a short break
  REVIEWING: "reviewing",       // reviewing a past mistake
  ASK_TUTOR: "ask-tutor",       // asking AI tutor to explain a missed question
  OFFLINE: "offline",           // network is down
};

export const SEVERITY = {
  HIGH: "high",
  MEDIUM: "medium",
  LOW: "low",
};

// — Session / Concept model —
export function createSession({ uid, startedAt, lastActive }) {
  return {
    uid,
    startedAt: startedAt || Date.now(),
    lastActive: lastActive || Date.now(),
    subject: null,
    exam: null,
    topic: null,
    questionLog: [],
    seenConceptIds: [],
    answeredConcepts: [], // unique conceptIds the student answered
  };
}

// — Learning Engine public API —
export function initialState({ subject, exam, topic, seenCounts = {} } = {}) {
  // Detect patterns from existing data if provided, else fresh state
  return {
    session: createSession({}),

    // Running patterns + interventions detected across sessions
    patterns: [],

    // Countermeasure level seen per pattern
    seenCounts,

    // Whether the engine wants to enter tutor mode
    needsTutor: false,

    // Guardrail status
    guardrailBlocked: false,

    // Offline flag
    isOffline: isOffline(),

    // Transfers unlocked by mastery
    unlockedTransfers: [],

    // Timestamp
    lastUpdated: Date.now(),
  };
}

export function transition(state, action) {
  switch (action.type) {
    case "UPDATE_SESSION": {
      const { subject, exam, topic, questionLog = [] } = action.payload;
      const session = { ...state.session, subject, exam, topic, lastActive: Date.now() };
      const newQlog = [...state.session.questionLog, ...questionLog].slice(-20); // keep last 20
      const updatedSession = { ...session, questionLog: newQlog };

      // Detect patterns from sessions captured so far
      const sessions = [updatedSession];
      const patterns = detectPatterns({ sessions, memory: state.answeredConcepts || [] });
      const seen = seeCounts(state.seenCounts, patterns);

      return {
        ...state,
        session: updatedSession,
        patterns,
        seenCounts: seen,
        lastUpdated: Date.now(),
        needsTutor: patterns.length > 0 && !state.guardrailBlocked,
      };
    }

    case "SET_GUARDRAIL": {
      return {
        ...state,
        guardrailBlocked: action.payload.allowed === false,
        lastUpdated: Date.now(),
      };
    }

    case "SET_OFFLINE": {
      return {
        ...state,
        isOffline: action.payload.isOffline,
        lastUpdated: Date.now(),
      };
    }

    case "SET_NEEDS_TUTOR": {
      return {
        ...state,
        needsTutor: action.payload.needsTutor,
        lastUpdated: Date.now(),
      };
    }

    case "UNLOCK_TRANSFERS": {
      const { mastered = [], failed = [] } = action.payload;
      return {
        ...state,
        unlockedTransfers: unlockedTransfers({ mastered, failed }),
        lastUpdated: Date.now(),
      };
    }

    case "UPDATE_SEEN_COUNTS": {
      const { key, level } = action.payload;
      const seenCounts = { ...state.seenCounts, [key]: level };
      return {
        ...state,
        seenCounts,
        lastUpdated: Date.now(),
      };
    }

    case "RESET": {
      return initialState();
    }

    default:
      return state;
  }
}

// — Core analyze flow: pattern detection + guardrails + countermeasure —
export function analyzeSession({ subject, exam, topic, questionLog = [], memory = [], seenCounts = {} } = {}) {
  // 1) If offline, serve deterministic fallback
  if (isOffline()) {
    const fallback = getOfflineExplanation(`${subject}::${topic}`);
    return {
      offline: true,
      explanation: fallback,
      patterns: [],
      needsTutor: false,
    };
  }

  // 2) Pattern detection
  const sessions = [questionLog.length > 0 ? { subject, exam, topic, questionLog } : null].filter(Boolean);
  const patterns = detectPatterns({ sessions, memory });
  if (patterns.length === 0) {
    return {
      offline: false,
      explanation: null,
      patterns: [],
      needsTutor: false,
    };
  }

  // 3) Guardrail check on each pattern
  const safePatterns = patterns.filter((p) => {
    const allowed = checkAnswerAllowed({
      kind: p.kind,
      questionId: p.topic,
      source: "practice",
      mode: "practice",
    });
    return allowed.ok;
  });

  // 4) Prescribe countermeasures
  const interventions = safePatterns.map((p) => {
    const key = `${p.subject}::${p.topic}::${p.kind}`;
    const seen = state?.seenCounts?.[key] ?? 0;
    const rx = prescribeCountermeasure(p, seen);
    return { pattern: p, rx };
  });

  return {
    offline: false,
    explanation: null,
    patterns: safePatterns,
    interventions,
    needsTutor: safePatterns.length > 0,
  };
}

// — Hook-able: run the engine against a student's last session, then
// render the appropriate UI (coach, ask-tutor, or prompt guardrail) —
export function runEngine({ subject, exam, topic, questionLog = [], memory = [], seenCounts = {} }) {
  const analysis = analyzeSession({ subject, exam, topic, questionLog, memory, seenCounts });

  if (analysis.offline) {
    return {
      ...analysis,
      mode: "offline-fallback",
    };
  }

  if (!analysis.needsTutor) {
    // No patterns = just coach with any existing misconceptions
    const misconceptions = getConceptMisconceptions(
      `${subject}::${topic}`
    );
    return {
      ...analysis,
      mode: "coach",
      misconceptions,
    };
  }

  // Needs AI tutor — build system prompt with guardrails
  const guardrailedPrompt = applyPromptGuardrails(
    `You are the JAMB/AI Tutor. Subject: ${subject}. Topic: ${topic}.`,
    "live-cbt"
  );

  // Build countermeasure data for the UI
  const firstIntervention = analysis.interventions?.[0];
  return {
    ...analysis,
    mode: "ask-tutor",
    systemPrompt: guardrailedPrompt,
    intervention: firstIntervention,
  };
}

// Utility helpers SESSION_STATE and SEVERITY are exported at declaration above.
