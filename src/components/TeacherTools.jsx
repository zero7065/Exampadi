// TeacherTools \u2014 Real-time classroom interaction tools for teachers.
import { useState, useEffect, useMemo } from "react";
import { useToast } from "../components/Toast";
import { useAuth } from "../context/AuthContext";
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { addDoc } from "firebase/firestore";

// Firestore Timestamps are objects — never subtract them directly.
function isRecentlyActive(ts, windowMs = 60000) {
  if (!ts) return false;
  const ms = ts.toMillis ? ts.toMillis() : (ts.seconds ? ts.seconds * 1000 : Number(ts));
  if (!Number.isFinite(ms)) return false;
  return Date.now() - ms < windowMs;
}
import { 
  Users, Send, TrendingUp, AlertTriangle, Zap, 
  MessageSquare, ThumbsUp, ThumbsDown, Volume2, VolumeX,
  Eye, EyeOff, Timer, Settings, RefreshCw, Download, Plus, X, HelpCircle, EyeOff as EyeOffIcon, Volume2 as Volume2Icon
} from "lucide-react";

export default function TeacherTools({ schoolId, roster, classId }) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [liveResponses, setLiveResponses] = useState({});
  const [polls, setPolls] = useState([]);
  const [pollVotes, setPollVotes] = useState({});
  const [attentionRequests, setAttentionRequests] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [showPollForm, setShowPollForm] = useState(false);
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [sending, setSending] = useState(false);

  // Subscribe to live student responses
  useEffect(function() {
    if (!classId) return;
    const responsesRef = collection(db, "classResponses");
    const q = query(responsesRef, where("classId", "==", classId));
    const unsub = onSnapshot(q, function(snap) {
      var responses = {};
      snap.docs.forEach(function(d) {
        var data = d.data();
        responses[data.studentUid] = data;
      });
      setLiveResponses(responses);
    });
    return function() { return unsub(); };
  }, [classId]);

  // Subscribe to polls
  useEffect(function() {
    if (!classId) return;
    const pollsRef = collection(db, "classPolls");
    const q = query(pollsRef, where("classId", "==", classId), where("active", "==", true));
    const unsub = onSnapshot(q, function(snap) {
      setPolls(snap.docs.map(function(d) { return { id: d.id, ...d.data() }; }));
    });
    return function() { return unsub(); };
  }, [classId]);

  // Subscribe to poll votes — students only write their own vote doc, so the
  // teacher derives tallies here (votes can never be inflated client-side).
  useEffect(function() {
    if (!classId) return;
    const votesRef = collection(db, "classPollVotes");
    const q = query(votesRef, where("classId", "==", classId));
    const unsub = onSnapshot(q, function(snap) {
      const tallies = {};
      snap.docs.forEach(function(d) {
        const v = d.data();
        if (!tallies[v.pollId]) tallies[v.pollId] = { counts: {}, total: 0 };
        const idx = v.optionIdx;
        tallies[v.pollId].counts[idx] = (tallies[v.pollId].counts[idx] || 0) + 1;
        tallies[v.pollId].total += 1;
      });
      setPollVotes(tallies);
    });
    return function() { return unsub(); };
  }, [classId]);

  // Subscribe to attention requests
  useEffect(function() {
    if (!classId) return;
    const attentionRef = collection(db, "attentionRequests");
    const q = query(attentionRef, where("classId", "==", classId), where("resolved", "==", false));
    const unsub = onSnapshot(q, function(snap) {
      setAttentionRequests(snap.docs.map(function(d) { return { id: d.id, ...d.data() }; }));
    });
    return function() { return unsub(); };
  }, [classId]);

  // Subscribe to announcements
  useEffect(function() {
    if (!classId) return;
    const annRef = collection(db, "classAnnouncements");
    const q = query(annRef, where("classId", "==", classId), where("active", "==", true));
    const unsub = onSnapshot(q, function(snap) {
      setAnnouncements(snap.docs.map(function(d) { return { id: d.id, ...d.data() }; }));
    });
    return function() { return unsub(); };
  }, [classId]);

  function createPoll() {
    if (!pollQuestion.trim() || pollOptions.filter(function(o) { return o.trim(); }).length < 2) {
      toast({ message: "Need a question and at least 2 options", type: "warning" });
      return;
    }
    setSending(true);
    var cleanOpts = pollOptions.filter(function(o) { return o.trim(); }).slice(0, 6);
    addDoc(collection(db, "classPolls"), {
      classId: classId,
      teacherUid: user ? user.uid : null,
      question: pollQuestion.trim(),
      options: cleanOpts,
      votes: Object.fromEntries(cleanOpts.map(function(_, i) { return [i, 0]; })),
      totalVotes: 0,
      active: true,
      createdAt: serverTimestamp(),
    }).then(function() {
      setPollQuestion("");
      setPollOptions(["", ""]);
      setShowPollForm(false);
      toast({ message: "Poll sent to class!", type: "success" });
    }).catch(function(e) {
      toast({ message: "Failed: " + e.message, type: "error" });
    }).finally(function() {
      setSending(false);
    });
  }

  function closePoll(pollId) {
    updateDoc(doc(db, "classPolls", pollId), { active: false, closedAt: serverTimestamp() })
      .then(function() { toast({ message: "Poll closed", type: "success" }); })
      .catch(function(e) { toast({ message: "Failed: " + e.message, type: "error" }); });
  }

  function resolveAttention(requestId, studentUid) {
    updateDoc(doc(db, "attentionRequests", requestId), { resolved: true, resolvedAt: serverTimestamp() })
      .then(function() { toast({ message: "Attention request resolved", type: "success" }); })
      .catch(function(e) { toast({ message: "Failed: " + e.message, type: "error" }); });
  }

  function sendAnnouncement(message) {
    if (!message.trim()) return;
    addDoc(collection(db, "classAnnouncements"), {
      classId: classId,
      teacherUid: user ? user.uid : null,
      message: message.trim(),
      active: true,
      createdAt: serverTimestamp(),
    }).then(function() {
      toast({ message: "Announcement sent!", type: "success" });
    }).catch(function(e) {
      toast({ message: "Failed: " + e.message, type: "error" });
    });
  }

  var onlineStudents = roster.filter(function(r) { 
    return isRecentlyActive(liveResponses[r.uid]?.lastActive);
  }).length;

  var pollFormButton = showPollForm ? (
    <button onClick={function() { setShowPollForm(false); }} className="btn-secondary text-sm">
      <EyeOff size={14} /> Hide Create Poll
    </button>
  ) : (
    <button onClick={function() { setShowPollForm(true); }} className="btn-secondary text-sm">
      <Eye size={14} /> Create Poll
    </button>
  );

  return (
    <div className="glass-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-text flex items-center gap-2"><Zap size={18} className="text-primary" /> Classroom Tools</h2>
        <div className="flex items-center gap-2 text-sm text-text-muted">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" /> {onlineStudents} online</span>
          <span className="flex items-center gap-1">{roster.length} total</span>
        </div>
      </div>

      <div className="flex gap-2 border-b border-border pb-2" style={{ overflowX: "auto" }}>
        {["overview", "polls", "attention", "announcements", "analytics"].map(function(tab) {
          return (
            <button key={tab} onClick={function() { setActiveTab(tab); }} className={"px-4 py-2 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap " + (activeTab === tab ? "bg-primary text-black" : "text-text-muted hover:text-text")}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === "overview" && (
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="glass-card p-4 text-center hover:scale-[1.02] transition-transform">
            <Users size={24} className="text-primary mx-auto mb-2" />
            <div className="text-3xl font-black text-text">{roster.length}</div>
            <div className="text-xs text-text-muted">Total Students</div>
          </div>
          <div className="glass-card p-4 text-center hover:scale-[1.02] transition-transform">
            <Zap size={24} className="text-green-500 mx-auto mb-2" />
            <div className="text-3xl font-black text-green-500">{onlineStudents}</div>
            <div className="text-xs text-text-muted">Currently Online</div>
          </div>
          <div className="glass-card p-4 text-center hover:scale-[1.02] transition-transform">
            <MessageSquare size={24} className="text-accent mx-auto mb-2" />
            <div className="text-3xl font-black text-accent">{polls.filter(function(p) { return p.active; }).length}</div>
            <div className="text-xs text-text-muted">Active Polls</div>
          </div>
          <div className="glass-card p-4 text-center hover:scale-[1.02] transition-transform">
            <AlertTriangle size={24} className="text-red-500 mx-auto mb-2" />
            <div className="text-3xl font-black text-red-500">{attentionRequests.length}</div>
            <div className="text-xs text-text-muted">Needs Attention</div>
          </div>
        </div>
      )}

      {/* Polls Tab */}
      {activeTab === "polls" && (
        <div className="space-y-4">
          <div className="flex gap-2 justify-end">
            {pollFormButton}
          </div>
          
          {showPollForm && (
            <div className="glass-card p-4 space-y-3 animate-slide-up">
              <input
                value={pollQuestion}
                onChange={function(e) { setPollQuestion(e.target.value); }}
                placeholder="Poll question (e.g. Which topic should we review?)"
                className="input-field"
              />
              <div className="space-y-2">
                {pollOptions.map(function(opt, i) {
                  return (
                    <div key={i} className="flex gap-2">
                      <input
                        value={opt}
                        onChange={function(e) { setPollOptions(function(o) { return o.map(function(v, j) { return j === i ? e.target.value : v; }); }); }}
                        placeholder={"Option " + (i + 1)}
                        className="input-field flex-1"
                      />
                      {pollOptions.length > 2 && (
                        <button onClick={function() { setPollOptions(function(o) { return o.filter(function(_, j) { return j !== i; }); }); }} className="btn-secondary px-3 text-sm">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              {pollOptions.length < 6 && (
                <button onClick={function() { setPollOptions([...pollOptions, ""]); }} className="btn-secondary text-sm w-full">
                  <Plus size={14} /> Add Option
                </button>
              )}
              <div className="flex gap-2">
                <button onClick={createPoll} disabled={sending} className="btn-primary flex-1">
                  {sending ? "Sending..." : "Send Poll to Class"}
                </button>
                <button onClick={function() { setShowPollForm(false); setPollQuestion(""); setPollOptions(["", ""]); }} className="btn-secondary px-4">Cancel</button>
              </div>
            </div>
          )}

          {polls.length === 0 && !showPollForm && (
            <div className="glass-card p-8 text-center text-text-muted">
              <MessageSquare size={32} className="mx-auto mb-3 opacity-50" />
              <p>No active polls. Create one to engage your class!</p>
            </div>
          )}

          {polls.map(function(poll) {
            return (
              <div key={poll.id} className="glass-card p-4 space-y-3 animate-slide-up">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="font-semibold text-text">{poll.question}</p>
                    <p className="text-xs text-text-muted">Created {poll.createdAt?.toDate ? poll.createdAt.toDate().toLocaleString() : "recently"} · {(pollVotes[poll.id]?.total || 0)} votes</p>
                  </div>
                  <span className={"px-2 py-1 rounded-full text-xs font-bold " + (poll.active ? "bg-green-500/20 text-green-500" : "bg-gray-500/20 text-gray-500")}>
                    {poll.active ? "LIVE" : "CLOSED"}
                  </span>
                </div>
                <div className="space-y-2">
                  {poll.options.map(function(opt, i) {
                    var tally = pollVotes[poll.id] || { counts: {}, total: 0 };
                    var votes = tally.counts[i] || 0;
                    var pct = tally.total > 0 ? (votes / tally.total) * 100 : 0;
                    return (
                      <div key={i} className="flex items-center gap-3">
                        <span className="text-sm text-text flex-1">{opt}</span>
                        <div className="flex-1 h-2 bg-bg-3 rounded overflow-hidden">
                          <div style={{ width: pct + "%", height: "100%", background: "var(--primary)", borderRadius: "2px", transition: "width 0.5s ease" }} />
                        </div>
                        <span className="text-sm font-bold text-primary w-16 text-right">{votes} ({pct.toFixed(0)}%)</span>
                      </div>
                    );
                  })}
                </div>
                {poll.active && (
                  <button onClick={function() { closePoll(poll.id); }} className="btn-secondary w-full text-sm">
                    Close Poll
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Attention Requests Tab */}
      {activeTab === "attention" && (
        <div className="space-y-3">
          {attentionRequests.length === 0 && (
            <div className="glass-card p-8 text-center text-text-muted">
              <ThumbsUp size={32} className="mx-auto mb-3 opacity-50" />
              <p>No students need attention right now. Great job!</p>
            </div>
          )}
          {attentionRequests.map(function(req) {
            return (
              <div key={req.id} className="glass-card p-4 animate-slide-up border-l-4 border-amber-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <AlertTriangle size={20} className="text-amber-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-text">{req.studentName || "Student"}</p>
                      <p className="text-sm text-text-muted">{req.message || "Needs help"} · {req.createdAt?.toDate ? req.createdAt.toDate().toLocaleTimeString() : "just now"}</p>
                    </div>
                  </div>
                  <button onClick={function() { resolveAttention(req.id, req.studentUid); }} className="btn-primary px-4 text-sm">
                    Resolve
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Announcements Tab */}
      {activeTab === "announcements" && (
        <div className="space-y-4">
          <div className="glass-card p-4">
            <label className="text-xs font-bold text-text-muted mb-2 block">Send announcement to class</label>
            <div className="flex gap-2">
              <input type="text" placeholder="Type your announcement..." className="input-field flex-1" onKeyDown={function(e) { if (e.key === "Enter") { sendAnnouncement(e.target.value); e.target.value = ""; } }} />
              <button onClick={function(e) { var input = e.currentTarget.parentElement.querySelector("input"); sendAnnouncement(input.value); input.value = ""; }} className="btn-primary px-4">Send</button>
            </div>
          </div>
          
          {announcements.length === 0 && (
            <div className="glass-card p-8 text-center text-text-muted">
              <Volume2 size={32} className="mx-auto mb-3 opacity-50" />
              <p>No active announcements.</p>
            </div>
          )}
          
          {announcements.map(function(ann) {
            return (
              <div key={ann.id} className="glass-card p-4 animate-slide-up border-l-4 border-primary">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-text">{ann.message}</p>
                    <p className="text-xs text-text-muted mt-1">Sent {ann.createdAt?.toDate ? ann.createdAt.toDate().toLocaleString() : "recently"}</p>
                  </div>
                  <button onClick={async function() { await updateDoc(doc(db, "classAnnouncements", ann.id), { active: false }); }} className="btn-secondary text-sm">Dismiss</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === "analytics" && (
        <div className="space-y-4">
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="glass-card p-4 text-center">
              <TrendingUp size={24} className="text-primary mx-auto mb-2" />
              <div className="text-2xl font-black text-text">
                {roster.reduce(function(sum, s) { return sum + (liveResponses[s.uid]?.questionsAnswered || 0); }, 0)}
              </div>
              <div className="text-xs text-text-muted">Questions Answered (Live)</div>
            </div>
            <div className="glass-card p-4 text-center">
              <ThumbsUp size={24} className="text-green-500 mx-auto mb-2" />
              <div className="text-2xl font-black text-green-500">
                {roster.filter(function(s) { return liveResponses[s.uid]?.understood === true; }).length}
              </div>
              <div className="text-xs text-text-muted">Students Understood</div>
            </div>
            <div className="glass-card p-4 text-center">
              <ThumbsDown size={24} className="text-red-500 mx-auto mb-2" />
              <div className="text-2xl font-black text-red-500">
                {roster.filter(function(s) { return liveResponses[s.uid]?.understood === false; }).length}
              </div>
              <div className="text-xs text-text-muted">Students Confused</div>
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="font-bold text-text mb-3">Student Engagement (Live)</h3>
            {roster.length === 0 ? (
              <p className="text-text-muted text-center py-8">No students in class yet</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {roster.map(function(s) {
                  var resp = liveResponses[s.uid];
                  var online = isRecentlyActive(resp?.lastActive);
                  var understood = resp?.understood;
                  return (
                    <div key={s.uid} className="flex items-center gap-3 p-2 bg-bg-3 rounded-lg hover:bg-bg-2 transition-colors">
                      <div className={"w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm " + (online ? "bg-green-500 text-black" : "bg-gray-500 text-white")}>
                        {s.name?.[0]?.toUpperCase() || "?"}
                      </div>
                      <span className="text-sm font-medium text-text flex-1 truncate">{s.name}</span>
                      <span className={"px-2 py-1 rounded-full text-xs font-bold " + (online ? "bg-green-500/20 text-green-500" : "bg-gray-500/20 text-gray-500")}>
                        {online ? "Online" : "Offline"}
                      </span>
                      <span className={"px-2 py-1 rounded-full text-xs font-bold " + (understood === true ? "bg-green-500/20 text-green-500" : understood === false ? "bg-red-500/20 text-red-500" : "bg-gray-500/20 text-gray-500")}>
                        {understood === true ? "\u2713 Understood" : understood === false ? "\u2717 Confused" : "\u2014"}
                      </span>
                      {resp?.questionsAnswered > 0 && (
                        <span className="text-xs text-text-muted">{resp.questionsAnswered} Qs</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}