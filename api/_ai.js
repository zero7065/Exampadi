import { handleAIRequest } from "./ai/_gateway.js";

export default function handler(req, res) {
  return handleAIRequest(req, res);
}
