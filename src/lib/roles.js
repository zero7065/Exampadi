// Shared role helpers.
import { isAdmin as checkAdmin } from "./activityLog";

export function isTeacherRole(profile, user) {
  if (checkAdmin(user)) return true;
  return profile?.role === "teacher";
}

export function isManagementRole(profile) {
  return profile?.role === "management";
}
