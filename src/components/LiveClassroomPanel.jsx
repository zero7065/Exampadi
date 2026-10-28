// src/components/LiveClassroomPanel.jsx
// Shared live-class video + instructions surface used by ClassroomMode and the
// study room. Video is never proxied through Vercel: Jitsi runs in an iframe on
// meet.jit.si, and external providers (Zoom/Meet/Teams) open in a new tab.
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ExternalLink, Info, Pin, Radio, Video, RadioTower,
} from "lucide-react";
import { subscribeClassSession } from "../lib/classroom";

function resourceList(session) {
  return Array.isArray(session?.pinnedResources) ? session.pinnedResources.slice(0, 3) : [];
}

function isEnded(session) {
  return Boolean(session) && (session.status === "ended" || session.active === false);
}

function isLive(session) {
  return Boolean(session) && !isEnded(session)
    && (session.status === "live" || session.status === "paused" || session.active === true);
}

export function ReturnToRoomCard({ session, classId, onReturn }) {
  const pinned = resourceList(session);
  return (
    <section className="glass-card p-5 space-y-3" aria-live="polite">
      <div className="flex items-start gap-3">
        <span className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: "var(--bg-3)", color: "var(--text-muted)" }}>
          <Radio size={18} />
        </span>
        <div className="min-w-0">
          <h2 className="font-black text-text">Session ended — return to room</h2>
          <p className="text-sm text-text-muted mt-1">
            The live class has finished. Your study room is still open, and your teacher's pinned resources are below.
          </p>
        </div>
      </div>

      {pinned.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5"><Pin size={12} /> Pinned by your teacher</p>
          <ul className="space-y-2">
            {pinned.map((r, i) => (
              <li key={`${r.title}-${i}`} className="rounded-xl p-3" style={{ background: "var(--bg-3)" }}>
                <p className="text-sm font-bold text-text">{r.title || "Resource"}</p>
                {r.body && <p className="text-xs text-text-muted mt-1 whitespace-pre-wrap">{r.body}</p>}
                {r.url && (
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary inline-flex items-center gap-1 mt-1">
                    Open link <ExternalLink size={12} />
                  </a>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {onReturn ? (
          <button type="button" onClick={onReturn} className="btn-primary inline-flex items-center gap-2 px-5">
            <ArrowLeft size={16} /> Return to room
          </button>
        ) : (
          <Link to={`/room`} className="btn-primary inline-flex items-center gap-2 px-5">
            <ArrowLeft size={16} /> Return to room
          </Link>
        )}
        {classId && (
          <Link to={`/room`} className="btn-secondary inline-flex items-center gap-2 px-4">
            Study room
          </Link>
        )}
      </div>
    </section>
  );
}

export function ClassInstructions({ session }) {
  const pinned = resourceList(session);
  if (!session?.instructions && !session?.rules && pinned.length === 0) return null;
  return (
    <details className="glass-card p-4" open>
      <summary className="cursor-pointer text-sm font-black text-text flex items-center gap-2 select-none">
        <Info size={16} className="text-primary" /> Class instructions
      </summary>
      <div className="mt-3 space-y-3">
        {session.instructions && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Instructions</p>
            <p className="text-sm text-text whitespace-pre-wrap mt-1">{session.instructions}</p>
          </div>
        )}
        {session.rules && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted">Rules</p>
            <p className="text-sm text-text whitespace-pre-wrap mt-1">{session.rules}</p>
          </div>
        )}
        {pinned.length > 0 && (
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-1.5"><Pin size={12} /> Pinned resources</p>
            <ul className="space-y-2 mt-1">
              {pinned.map((r, i) => (
                <li key={`${r.title}-${i}`} className="rounded-xl p-3" style={{ background: "var(--bg-3)" }}>
                  <p className="text-sm font-bold text-text">{r.title || "Resource"}</p>
                  {r.body && <p className="text-xs text-text-muted mt-1 whitespace-pre-wrap">{r.body}</p>}
                  {r.url && (
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-xs font-bold text-primary inline-flex items-center gap-1 mt-1">
                      Open link <ExternalLink size={12} />
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </details>
  );
}

export function LiveVideoPanel({ session, classId, isTeacher }) {
  if (!session || isEnded(session)) return null;
  const provider = session.videoProvider === "external" ? "external" : "jitsi";
  const room = session.videoRoom || `exampadi-${String(classId || "").slice(0, 40)}`;
  const jitsiSrc = `https://meet.jit.si/${encodeURIComponent(room)}#config.prejoinPageEnabled=false&config.disableDeepLinking=true&config.startWithAudioMuted=true&config.startWithVideoMuted=true`;

  return (
    <section className="glass-card p-3 space-y-2" aria-label="Live class video">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-widest text-text-muted">
          <Video size={14} className="text-primary" /> Live video
        </span>
        <span className="inline-flex items-center gap-3 flex-wrap">
          {session.recording && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-red-500">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" /> Recording
            </span>
          )}
          {isTeacher && (
            <span className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-text-muted">
              <RadioTower size={12} /> {provider === "external" ? "External link" : "Jitsi"}
            </span>
          )}
        </span>
      </div>

      {provider === "external" ? (
        session.videoUrl ? (
          <a href={session.videoUrl} target="_blank" rel="noreferrer" className="btn-primary inline-flex items-center gap-2 px-4">
            <ExternalLink size={16} /> Join video in new tab
          </a>
        ) : (
          <p className="text-sm text-text-muted">Your teacher has not added a video link yet.</p>
        )
      ) : (
        <div className="rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16 / 9" }}>
          <iframe
            key={room}
            src={jitsiSrc}
            title="Live class video"
            allow="camera; microphone; fullscreen; display-capture; autoplay; clipboard-write"
            allowFullScreen
            style={{ width: "100%", height: "100%", border: 0 }}
          />
        </div>
      )}
    </section>
  );
}

// Banner shown inside a study room for students in a class with a live session.
export function LiveClassBanner({ classId }) {
  const [session, setSession] = useState(null);

  useEffect(() => {
    if (!classId) return undefined;
    return subscribeClassSession(classId, setSession);
  }, [classId]);

  if (!classId || !session) return null;

  if (isLive(session)) {
    return (
      <section className="glass-card p-4 border-2" style={{ borderColor: "var(--primary)" }} aria-live="polite">
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="min-w-0">
            <p className="font-black text-text flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" /> Live class is on
            </p>
            <p className="text-xs text-text-muted mt-0.5">{session.subject || "Your class"} — join without leaving the app.</p>
          </div>
          <Link to={`/classroom?class=${classId}`} className="btn-primary inline-flex items-center gap-2 px-5">
            <Video size={16} /> Join live class
          </Link>
        </div>
      </section>
    );
  }

  if (isEnded(session)) {
    return <ReturnToRoomCard session={session} classId={classId} />;
  }

  return null;
}
