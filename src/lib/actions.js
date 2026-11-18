// Central catalogue of activity-log action names.
// Always log via logActivity({ action: ACTIONS.X, ... }) so the action names
// never drift between writers and the readers (Admin console + user feed).
export const ACTIONS = {
  // Account
  REGISTER: "register",
  LOGIN: "login",
  LOGOUT: "logout",
  ONBOARDING_COMPLETE: "onboarding_complete",
  PROFILE_UPDATE: "profile_update",
  SETTINGS_CHANGE: "settings_change",

  // Practice & exams
  PRACTICE_START: "practice_start",
  QUESTION_ANSWERED: "question_answered",
  SESSION_COMPLETE: "session_complete",
  HIGH_SCORE: "high_score",
  STREAK: "streak",
  MOCK_EXAM_COMPLETE: "mock_exam_complete",

  // Study tools
  FLASHCARD_REVIEW: "flashcard_review",
  STUDY_PLAN_UPDATE: "study_plan_update",
  NOTEPAD_SAVE: "notepad_save",
  LEGEND_MODE: "legend_mode",
  SHARE: "share",

  // Games & social
  GAME_PLAYED: "game_played",
  CHESS_RESULT: "chess_result",
  TRIVIA_PLAYED: "trivia_played",
  STUDY_PARTNER_CONNECT: "study_partner_connect",
  CLASS_JOINED: "class_joined",

  // AI
  AI_CHAT: "ai_chat",
  AI_IMAGE_REQUEST: "ai_image_request",

  // Payments
  PAYMENT_SUCCESS: "payment_success",
  PAYMENT_FAILED: "payment_failed",

  // Admin / management (internal)
  ADMIN_USER_READ: "admin_user_read",
  ADMIN_ROLE_CHANGE: "admin_role_change",
};
