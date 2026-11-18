import { useState, useRef } from "react";
import { Upload, FileText, Video, X } from "lucide-react";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { getAppStorage } from "../firebaseConfig";

const MAX_SIZE = 50 * 1024 * 1024;
const ALLOWED_TYPES = {
  "application/pdf": "pdf",
  "image/png": "image",
  "image/jpeg": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/webm": "video",
  "video/quicktime": "video",
};

export default function FileUpload({ onUploadComplete, onUploadError }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const inputRef = useRef(null);

  function handleFileSelect(e) {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > MAX_SIZE) {
      onUploadError?.("File too large. Maximum size is 50MB.");
      return;
    }
    const type = ALLOWED_TYPES[f.type];
    if (!type) {
      onUploadError?.("Unsupported file type. Use PDF, PNG, JPG, WEBP, MP4, or WEBM.");
      return;
    }
    setFile(f);
    setProgress(0);
    if (type === "image") {
      const reader = new FileReader();
      reader.onload = (ev) => setPreview(ev.target.result);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }

  function saveLocalFallback(errMsg) {
    // Works even when Firebase Storage is unavailable/permission-denied.
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const localFiles = JSON.parse(localStorage.getItem("localUploads") || "[]");
        localFiles.push({ name: file.name, type: file.type, size: file.size, data: ev.target.result, uploadedAt: Date.now() });
        localStorage.setItem("localUploads", JSON.stringify(localFiles.slice(-5)));
        onUploadComplete?.({ url: ev.target.result, name: file.name, type: file.type, size: file.size, path: "local" });
        setUploading(false);
        setFile(null);
        setPreview(null);
      } catch {
        onUploadError?.(`Upload failed (${errMsg}) and the file is too large to save locally. Try a smaller image.`);
        setUploading(false);
      }
    };
    reader.onerror = () => { onUploadError?.(`Upload failed: ${errMsg}`); setUploading(false); };
    reader.readAsDataURL(file);
  }

  async function handleUpload() {
    if (!file) return;
    const storage = getAppStorage();
    if (!storage) {
      // No Storage configured yet — save locally so the flow never dead-ends.
      saveLocalFallback("cloud storage unavailable");
      return;
    }
    setUploading(true);
    setProgress(0);
    try {
      const path = `uploads/${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const storageRef = ref(storage, path);
      const task = uploadBytesResumable(storageRef, file);
      task.on("state_changed",
        (snap) => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
        (err) => {
          console.warn("[FileUpload] Cloud upload failed, falling back to local:", err?.message);
          saveLocalFallback(err?.code || err?.message || "storage error");
        },
        async () => {
          const url = await getDownloadURL(task.snapshot.ref);
          onUploadComplete?.({ url, name: file.name, type: file.type, size: file.size, path });
          setUploading(false);
          setFile(null);
          setPreview(null);
          setProgress(0);
        }
      );
    } catch (e) {
      onUploadError?.(e.message);
      setUploading(false);
    }
  }

  function clear() {
    setFile(null);
    setPreview(null);
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  }

  const fileType = file ? ALLOWED_TYPES[file.type] : null;

  return (
    <div style={{ padding: 16, borderRadius: 12, background: "var(--bg-3)", border: "1px solid #333" }}>
      <input ref={inputRef} type="file" accept={Object.keys(ALLOWED_TYPES).join(",")} onChange={handleFileSelect} style={{ display: "none" }} />

      {!file ? (
        <button onClick={() => inputRef.current?.click()} style={{ width: "100%", padding: 24, borderRadius: 12, background: "rgb(var(--primary-rgb) / 0.08)", border: "2px dashed rgb(var(--primary-rgb) / 0.3)", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
          <Upload size={32} color="var(--primary)" />
          <span style={{ color: "var(--text)", fontSize: 14, fontWeight: 600 }}>Upload Document or Video</span>
          <span style={{ color: "var(--text-muted)", fontSize: 12 }}>PDF, PNG, JPG, WEBP, MP4, WEBM — max 50MB</span>
        </button>
      ) : (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            {fileType === "image" && preview ? (
              <img src={preview} alt="Preview" style={{ width: 48, height: 48, borderRadius: 8, objectFit: "cover" }} />
            ) : fileType === "video" ? (
              <Video size={32} color="var(--primary)" />
            ) : (
              <FileText size={32} color="var(--primary)" />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: "var(--text)", fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{file.name}</div>
              <div style={{ color: "var(--text-muted)", fontSize: 11 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</div>
            </div>
            {!uploading && (
              <button onClick={clear} style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: 4 }}>
                <X size={18} />
              </button>
            )}
          </div>

          {uploading && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ height: 6, borderRadius: 3, background: "var(--border)", overflow: "hidden" }}>
                <div style={{ width: `${progress}%`, height: "100%", background: "var(--primary)", borderRadius: 3, transition: "width 0.3s" }} />
              </div>
              <div style={{ color: "var(--text-muted)", fontSize: 11, marginTop: 4, textAlign: "center" }}>{progress}% uploaded</div>
            </div>
          )}

          {!uploading && (
            <button onClick={handleUpload} style={{ width: "100%", padding: 12, borderRadius: 8, background: "var(--primary)", border: "none", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
              <Upload size={16} /> Upload to AI Tutor
            </button>
          )}
        </div>
      )}
    </div>
  );
}
