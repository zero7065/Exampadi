// src/lib/classroomProvider.js
// Video layer abstraction for ExamPadi classrooms.
// Supports Jitsi (self-hosted, no account) and ExternalLink (Zoom/Meet/Teams).

export class ClassroomProviderError extends Error {
  constructor(message, code) {
    super(message);
    this.name = "ClassroomProviderError";
    this.code = code;
  }
}

// ─── Jitsi Meet Provider (Apache 2.0, no account required, lowest risk) ───
export class JitsiClassroomProvider {
  constructor({ roomName, config = {}, interfaceConfig = {} } = {}) {
    this.roomName = roomName || `exampadi-${Math.random().toString(36).slice(2, 10)}`;
    this.config = config;
    this.interfaceConfig = interfaceConfig;
    this.api = null;
    this.isJoined = false;
  }

  async createSession({ subject, title, instructions = "" }) {
    const room = this.roomName;
    const embedUrl = `https://meet.jit.si/${encodeURIComponent(room)}#config.prejoinPageEnabled=false&config.displayName=ExamPadi%20Teacher`;
    return {
      roomName: room,
      embedUrl,
      provider: "jitsi",
      sessionId: room,
    };
  }

  async joinSession({ displayName, email, avatarUrl, onEvent }) {
    if (typeof window === "undefined") return;
    this.isJoined = true;
    // Jitsi Meet external API is loaded via script tag in index.html
    if (window.JitsiMeetExternalAPI) {
      this.api = new window.JitsiMeetExternalAPI(`meet.jit.si`, {
        roomName: this.roomName,
        width: "100%",
        height: "100%",
        parentNode: document.getElementById("jitsi-container") || document.body,
        configOverwrite: this.config,
        interfaceConfigOverwrite: this.interfaceConfig,
        onload: () => onEvent?.("jitsi_ready"),
      });
      this.api.executeCommand("displayName", displayName);
      if (email) this.api.executeCommand("email", email);
      if (avatarUrl) this.api.executeCommand("avatarUrl", avatarUrl);
    } else {
      throw new ClassroomProviderError("Jitsi API not loaded", "JITSI_NOT_LOADED");
    }
  }

  async leaveSession() {
    if (this.api) {
      this.api.dispose();
      this.api = null;
    }
    this.isJoined = false;
  }

  getEmbedUrl() {
    return `https://meet.jit.si/${encodeURIComponent(this.roomName)}`;
  }

  getControls() {
    return {
      muteAudio: () => this.api?.executeCommand("audioMute", true),
      unmuteAudio: () => this.api?.executeCommand("audioMute", false),
      muteVideo: () => this.api?.executeCommand("videoMute", true),
      unmuteVideo: () => this.api?.executeCommand("videoMute", false),
      shareScreen: () => this.api?.executeCommand("toggleShareAudio"),
      endSession: () => this.api?.executeCommand("hangup"),
      raiseHand: () => this.api?.executeCommand("toggleRaiseHand"),
    };
  }
}

// ─── ExternalLink Provider (Zoom/Meet/Teams URL supplied by teacher) ───
export class ExternalLinkClassroomProvider {
  constructor({ videoUrl, roomName } = {}) {
    this.videoUrl = videoUrl || "";
    this.roomName = roomName || `exampadi-${Math.random().toString(36).slice(2, 10)}`;
    this.isJoined = false;
  }

  async createSession({ subject, title, instructions = "" }) {
    return {
      roomName: this.roomName,
      embedUrl: this.videoUrl,
      provider: "external",
      sessionId: this.roomName,
      videoUrl: this.videoUrl,
    };
  }

  async joinSession({ displayName, onEvent }) {
    this.isJoined = true;
    onEvent?.("external_ready");
  }

  async leaveSession() {
    this.isJoined = false;
  }

  getEmbedUrl() {
    return this.videoUrl;
  }

  getControls() {
    return {
      endSession: () => {
        window.open(this.videoUrl, "_blank");
      },
    };
  }
}

// ─── Factory ───
export function createClassroomProvider(videoProvider = "jitsi", options = {}) {
  if (videoProvider === "external") {
    return new ExternalLinkClassroomProvider(options);
  }
  return new JitsiClassroomProvider(options);
}