// src/pages/ContactPage.jsx
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../components/Toast";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { MessageCircle, Send, CheckCircle } from "lucide-react";

const ContactPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [form, setForm] = useState({ subject: "", message: "" });
  const [sent, setSent] = useState(false);

  const handleSend = async () => {
    if (!form.subject || !form.message) {
      toast({ message: "Please fill all fields", type: "warning" });
      return;
    }

    try {
      await addDoc(collection(db, "feedback"), {
        userId: user?.uid || null,
        email: user?.email || "anonymous",
        subject: form.subject,
        message: form.message,
        createdAt: serverTimestamp(),
      });
      setSent(true);
      toast({ message: "Message sent! We'll respond soon.", type: "success" });
    } catch (e) {
      toast({ message: "Failed to send message. Please try again.", type: "error" });
    }
  };

  if (sent) {
    return (
      <div className="max-w-lg mx-auto p-6 md:p-10 animate-fade">
        <div className="glass-card p-12 text-center">
          <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={40} className="text-success" />
          </div>
          <h2 className="text-3xl font-black mb-4">Message Sent!</h2>
          <p className="text-text-muted mb-8">
            Thank you for reaching out. Our team will review your message and respond within 24 hours.
          </p>
          <button onClick={() => { setSent(false); setForm({ subject: "", message: "" }); }} className="btn-secondary">
            Send Another Message
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-10 animate-fade">
      <header className="mb-10">
        <h1 className="text-4xl font-black mb-2 flex items-center gap-3">
          <MessageCircle className="text-primary" size={36} />
          Contact Us
        </h1>
        <p className="text-text-muted">
          Have questions, suggestions, or need support? We're here to help!
        </p>
      </header>

      <div className="glass-card p-8 space-y-6">
        <div>
          <label className="text-xs font-black uppercase tracking-widest text-text-muted block mb-3">
            Subject
          </label>
          <select 
            value={form.subject}
            onChange={(e) => setForm({ ...form, subject: e.target.value })}
            className="input-field"
          >
            <option value="">Select a topic</option>
            <option value="technical">Technical Issue</option>
            <option value="billing">Billing & Payments</option>
            <option value="suggestion">Feature Suggestion</option>
            <option value="partnership">Partnership Inquiry</option>
            <option value="other">Other</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-black uppercase tracking-widest text-text-muted block mb-3">
            Your Message
          </label>
          <textarea 
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
            className="input-field min-h-[200px]"
            placeholder="Tell us what's on your mind..."
          />
        </div>

        <button onClick={handleSend} className="btn-primary w-full py-4 flex items-center justify-center gap-3">
          <Send size={20} />
          Send Message
        </button>

        <p className="text-xs text-text-muted text-center">
          We'll respond to {user?.email || "your email"} within 24 hours
        </p>
      </div>

      <div className="mt-10 glass-card p-6">
        <h3 className="font-bold mb-4">Other ways to reach us:</h3>
        <div className="space-y-3 text-text-muted">
          <p>📧 Email: jadai7065@gmail.com</p>
          <p>📱 WhatsApp: +234 8127636057</p>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;