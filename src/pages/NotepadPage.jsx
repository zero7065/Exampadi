import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { useSubscription } from "../hooks/useSubscription";
import { useToast } from "../components/Toast";
import { collection, query, where, getDocs, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import ProGate from "../components/ProGate";
import { logActivity } from "../lib/activityLog";
import { ACTIONS } from "../lib/actions";
import { Save, Trash2, Clock } from "lucide-react";

const NotepadPage = () => {
  const { user } = useAuth();
  const { isPro: proStatus } = useSubscription();
  const { toast } = useToast();
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- no signed-in user: stop the loading spinner
    if (!user) { setLoading(false); return; }
    async function fetchNotes() {
      try {
        const q = query(
          collection(db, "notes"),
          where("userId", "==", user.uid)
        );
        const snap = await getDocs(q);
        const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        data.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
        setNotes(data);
      } catch (e) {
        console.error("Failed to load notes:", e);
      } finally {
        setLoading(false);
      }
    }
    fetchNotes();
  }, [user]);

  const handleAddNote = async () => {
    if (!newNote.trim() || !user) return;
    try {
      const docRef = await addDoc(collection(db, "notes"), {
        userId: user.uid,
        content: newNote,
        createdAt: serverTimestamp(),
      });
      setNotes([{ id: docRef.id, userId: user.uid, content: newNote, createdAt: new Date() }, ...notes]);
      setNewNote("");
      toast({ message: "Note saved!", type: "success" });
      logActivity({ action: ACTIONS.NOTEPAD_SAVE, userId: user.uid, email: user.email, details: { mode: "new", chars: newNote.length } });
    } catch (e) {
      toast({ message: "Failed to save note", type: "error" });
    }
  };

  const handleDeleteNote = async (id) => {
    try {
      await deleteDoc(doc(db, "notes", id));
      setNotes(notes.filter(n => n.id !== id));
      toast({ message: "Note deleted", type: "info" });
    } catch (e) {
      toast({ message: "Failed to delete note", type: "error" });
    }
  };

  const handleUpdateNote = async (id) => {
    if (!newNote.trim() || !user) return;
    try {
      await updateDoc(doc(db, "notes", id), {
        content: newNote,
        updatedAt: serverTimestamp(),
      });
      setNotes(notes.map(n => n.id === id ? { ...n, content: newNote, updatedAt: new Date() } : n));
      setNewNote("");
      setEditingId(null);
      toast({ message: "Note updated!", type: "success" });
      logActivity({ action: ACTIONS.NOTEPAD_SAVE, userId: user.uid, email: user.email, details: { mode: "edit", chars: newNote.length } });
    } catch (e) {
      toast({ message: "Failed to update note", type: "error" });
    }
  };

  const startEdit = (note) => {
    setNewNote(note.content);
    setEditingId(note.id);
  };

  if (!proStatus) {
    return (
      <div className="max-w-4xl mx-auto p-6 md:p-10">
        <ProGate feature="Personal Study Notepad" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-10 space-y-8 animate-fade">
      <header>
        <h1 className="text-4xl font-black mb-2 text-text">Study Notepad</h1>
        <p className="text-text-muted font-medium">
          Keep track of important concepts, formulas, and key points during your study sessions.
        </p>
      </header>

      <div className="glass-card p-6 space-y-4">
        <textarea
          value={newNote}
          onChange={(e) => setNewNote(e.target.value)}
          placeholder="Write your note here... (formulas, key concepts, reminders)"
          className="input-field min-h-[120px] resize-none"
          rows={4}
        />
        <div className="flex justify-end">
          {editingId ? (
            <div className="flex gap-3">
              <button
                onClick={() => { setNewNote(""); setEditingId(null); }}
                className="btn-secondary px-6"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdateNote(editingId)}
                disabled={!newNote.trim()}
                className="btn-primary flex items-center gap-2"
              >
                <Save size={18} />
                Update Note
              </button>
            </div>
          ) : (
            <button
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="btn-primary flex items-center gap-2"
            >
              <Save size={18} />
              Save Note
            </button>
          )}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12 text-text-muted">Loading notes...</div>
        ) : notes.length === 0 ? (
          <div className="text-center py-12 text-text-muted">
            <p className="font-medium">No notes yet.</p>
            <p className="text-sm">Start writing to keep track of your study key points.</p>
          </div>
        ) : (
          notes.map((note) => (
            <div key={note.id} className="glass-card p-6 group hover:border-primary/30 transition-all">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-text-muted text-xs mb-3">
                    <Clock size={14} />
                    <span>
                      {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleDateString() : new Date(note.createdAt).toLocaleDateString()}
                      {" at "}
                      {note.createdAt?.toDate ? note.createdAt.toDate().toLocaleTimeString() : new Date(note.createdAt).toLocaleTimeString()}
                    </span>
                    {note.updatedAt && (
                      <span className="text-primary">(edited)</span>
                    )}
                  </div>
                  <p className="text-text whitespace-pre-wrap leading-relaxed">{note.content}</p>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => startEdit(note)}
                    className="p-2 text-text-muted hover:text-primary transition-colors"
                    title="Edit"
                  >
                    <Save size={18} />
                  </button>
                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="p-2 text-text-muted hover:text-danger transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default NotepadPage;
