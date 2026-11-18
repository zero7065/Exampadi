// src/context/StudyContext.jsx - Works without Firebase (uses localStorage)
/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useReducer, useEffect, useMemo, useCallback } from "react";
import { db } from "../firebaseConfig";
import { doc, updateDoc, increment, collection, addDoc, serverTimestamp } from "firebase/firestore";
import { getQuestionsFromBank } from "../data/questions/compat";

const StudyContext = createContext();
export const useStudy = () => useContext(StudyContext);

const initialState = {
  currentSession: null,
  history: [],
};

function studyReducer(state, action) {
  switch (action.type) {
    case "START_SESSION":
      return { ...state, currentSession: action.payload };
    case "ANSWER_QUESTION": {
      const newAnswers = [...state.currentSession.answers];
      newAnswers[action.payload.index] = action.payload.answer;
      return {
        ...state,
        currentSession: { ...state.currentSession, answers: newAnswers },
      };
    }
    case "NEXT_QUESTION":
      return {
        ...state,
        currentSession: {
          ...state.currentSession,
          currentQuestionIndex: state.currentSession.currentQuestionIndex + 1,
        },
      };
    case "END_SESSION":
      localStorage.removeItem("exampadi_active_session");
      return { ...state, currentSession: null, history: [...state.history, action.payload] };
    case "LOAD_HISTORY":
      return { ...state, history: action.payload };
    default:
      return state;
  }
}

function getLocalSessions(userId) {
  const key = `exampadi_sessions_${userId}`;
  const data = localStorage.getItem(key);
  if (data) {
    try {
      return JSON.parse(data);
    } catch {
      return [];
    }
  }
  return [];
}

function saveLocalSession(userId, session) {
  const key = `exampadi_sessions_${userId}`;
  const sessions = getLocalSessions(userId);
  sessions.push({ ...session, completedAt: new Date().toISOString() });
  localStorage.setItem(key, JSON.stringify(sessions));
  
  // Update user stats in localStorage
  updateLocalUserStats(userId, session);
}

function updateLocalUserStats(userId, session) {
  const usersKey = "exampadi_users";
  const users = JSON.parse(localStorage.getItem(usersKey) || "[]");
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex !== -1) {
    users[userIndex].totalQuestionsAnswered = (users[userIndex].totalQuestionsAnswered || 0) + session.totalQuestions;
    users[userIndex].totalCorrect = (users[userIndex].totalCorrect || 0) + session.correctAnswers;
    users[userIndex].totalSessions = (users[userIndex].totalSessions || 0) + 1;
    users[userIndex].lastActiveDate = new Date().toISOString().split("T")[0];
    
    // Update current session if logged in
    const sessionKey = "exampadi_session";
    const current = JSON.parse(localStorage.getItem(sessionKey) || "null");
    if (current && current.id === userId) {
      localStorage.setItem(sessionKey, JSON.stringify(users[userIndex]));
    }
    
    localStorage.setItem(usersKey, JSON.stringify(users));
  }
}

export const StudyProvider = ({ children }) => {
  const [state, dispatch] = useReducer(studyReducer, initialState);
  const isConfigured = db !== null && db !== undefined;

  // Load history and resume session from localStorage on mount
  useEffect(() => {
    const session = localStorage.getItem("exampadi_session");
    if (session) {
      const user = JSON.parse(session);
      const history = getLocalSessions(user.id);
      dispatch({ type: "LOAD_HISTORY", payload: history });
      
      // Resume any active session
      const savedSession = localStorage.getItem("exampadi_active_session");
      if (savedSession) {
        try {
          const activeSession = JSON.parse(savedSession);
          // Only resume if less than 24 hours old
          if (Date.now() - activeSession.startTime < 24 * 60 * 60 * 1000) {
            dispatch({ type: "START_SESSION", payload: activeSession });
          } else {
            localStorage.removeItem("exampadi_active_session");
          }
        } catch (e) {
          localStorage.removeItem("exampadi_active_session");
        }
      }
    }
  }, []);

  // Save active session to localStorage on change (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (state.currentSession) {
        localStorage.setItem("exampadi_active_session", JSON.stringify(state.currentSession));
      } else {
        localStorage.removeItem("exampadi_active_session");
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [state.currentSession]);

  const startSession = useCallback(async (sessionData) => {
    let questions = sessionData.questions;
    const isRealArray = Array.isArray(questions) && questions.length > 0 && questions[0]?.question;

    if (!isRealArray) {
      const subjectRaw = Array.isArray(sessionData.subjects)
        ? sessionData.subjects[0]
        : sessionData.subjects;
      const subjectName = typeof subjectRaw === "object" ? subjectRaw.name : subjectRaw;

      questions = getQuestionsFromBank({
        subject: subjectName,
        exam: sessionData.exam,
        year: sessionData.year || null,
        count: sessionData.count || 10,
      });

      if (!questions || questions.length === 0) {
        questions = getQuestionsFromBank({
          subject: subjectName,
          exam: sessionData.exam,
          count: sessionData.count || 10,
        });
      }
    }

    if (!questions) questions = [];

    dispatch({
      type: "START_SESSION",
      payload: {
        ...sessionData,
        questions,
        currentQuestionIndex: 0,
        answers: new Array(questions.length).fill(null),
        startTime: Date.now(),
      },
    });
  }, []);

  const submitAnswer = useCallback((index, answer) => {
    dispatch({ type: "ANSWER_QUESTION", payload: { index, answer } });
  }, []);

  const nextQuestion = useCallback(() => {
    dispatch({ type: "NEXT_QUESTION" });
  }, []);

  const resumeSession = useCallback(() => {
    const savedSession = localStorage.getItem("exampadi_active_session");
    if (savedSession) {
      try {
        const activeSession = JSON.parse(savedSession);
        if (Date.now() - activeSession.startTime < 24 * 60 * 60 * 1000) {
          dispatch({ type: "START_SESSION", payload: activeSession });
          return true;
        }
      } catch (e) {
        console.error("Failed to resume session", e);
      }
    }
    return false;
  }, []);

  const clearActiveSession = useCallback(() => {
    localStorage.removeItem("exampadi_active_session");
  }, []);

  const saveSessionToFirestore = useCallback(async (userId, sessionResult) => {
    // Try Firebase first, fall back to localStorage
    if (isConfigured && db) {
      try {
        const sessionRef = collection(db, "users", userId, "sessions");
        await addDoc(sessionRef, {
          ...sessionResult,
          completedAt: serverTimestamp(),
        });

        const userRef = doc(db, "users", userId);
        await updateDoc(userRef, {
          totalQuestionsAnswered: increment(sessionResult.totalQuestions),
          totalCorrect: increment(sessionResult.correctAnswers),
          totalSessions: increment(1),
          lastActiveDate: new Date().toISOString().split("T")[0],
        });
      } catch (e) {
        console.log("Firebase save failed, using localStorage", e);
        saveLocalSession(userId, sessionResult);
      }
    } else {
      // Use localStorage
      saveLocalSession(userId, sessionResult);
    }
    
    dispatch({ type: "END_SESSION", payload: sessionResult });
  }, [isConfigured]);

  const ctxValue = useMemo(() => ({
    ...state,
    startSession,
    submitAnswer,
    nextQuestion,
    saveSessionToFirestore,
    resumeSession,
    clearActiveSession,
  }), [state, startSession, submitAnswer, nextQuestion, saveSessionToFirestore, resumeSession, clearActiveSession]);

  return (
    <StudyContext.Provider value={ctxValue}>
      {children}
    </StudyContext.Provider>
  );
};