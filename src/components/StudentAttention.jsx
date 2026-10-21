// StudentAttention \u2014 Component for students to request teacher attention in classroom mode
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { HelpCircle, CheckCircle, Loader2 } from "lucide-react";

export default function StudentAttention({ classId, enabled = true }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  async function requestAttention() {
    if (!enabled || !classId || !user || !db) return;
    if (!message.trim()) {
      toast({ message: "Tell the teacher what you need help with", type: "info" });
      return;
    }
    setSending(true);
    try {
      await addDoc(collection(db, "attentionRequests"), {
        classId,
        studentUid: user.uid,
        studentName: user.displayName || "Student",
        message: message.trim(),
        resolved: false,
        createdAt: serverTimestamp(),
      });
      setSent(true);
      setMessage("");
      toast({ message: "Teacher notified!", type: "success" });
    } catch (e) {
      toast({ message: "Failed: " + e.message, type: "error" });
    } finally {
      setSending(false);
    }
  }

  if (!enabled || !classId) return null;

  if (sent) {
    return (
      <div className="glass-card p-4 animate-slide-up border-l-4 border-green-500">
        <div className="flex items-center gap-3">
          <CheckCircle size={24} className="text-green-500" />
          <div>
            <p className="font-semibold text-text">Request sent!</p>
            <p className="text-sm text-text-muted">Your teacher has been notified. They will help you shortly.</p>
          </div>
        </div>
        <button onClick={() => setSent(false)} className="btn-secondary w-full mt-3 text-sm">
          Send another request
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card p-4 animate-slide-up border-l-4 border-primary">
      <div className="flex items-start gap-3">
        <HelpCircle size={24} className="text-primary mt-0.5" />
        <div className="flex-1">
          <p className="font-semibold text-text mb-2">Need help? Raise your hand</p>
          <p className="text-sm text-text-muted mb-3">Type what you are stuck on and your teacher will see it instantly.</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder="e.g. Stuck on vectors question 3 or Need clarification on Newton laws"
              className="input-field flex-1"
              onKeyDown={e => e.key === "Enter" && requestAttention()}
              maxLength={200}
            />
            <button
              onClick={requestAttention}
              disabled={sending || !message.trim()}
              className="btn-primary px-5 disabled:opacity-60"
            >
              {sending ? <Loader2 size={14} className="animate-spin" /> : "Send to Teacher"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}