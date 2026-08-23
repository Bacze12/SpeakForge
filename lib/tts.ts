export type TtsEngine = "edge" | "gemini" | "google" | "browser";

export class TtsPlayer {
  private audioRef: HTMLAudioElement | null = null;
  private synth = typeof window !== "undefined" && "speechSynthesis" in window ? window.speechSynthesis : null;
  private utterance: SpeechSynthesisUtterance | null = null;
  private mode: TtsEngine = "browser";
  private onEnd: (() => void) | null = null;

  setOnEnd(fn: (() => void) | null) {
    this.onEnd = fn;
  }

  async speak(text: string, opts: { lang?: string; rate?: number; gender?: "FEMALE" | "MALE" | "NEUTRAL" } = {}): Promise<TtsEngine> {
    this.cancel();
    const lang = opts.lang || "en-US";
    const rate = opts.rate || 1;
    const remote = await this.remoteSpeak(text, lang, rate, opts.gender || "FEMALE");
    if (remote) {
      this.mode = remote;
      return remote;
    }
    this.browserSpeak(text, lang, rate);
    this.mode = "browser";
    return "browser";
  }

  private async remoteSpeak(
    text: string,
    lang: string,
    rate: number,
    gender: "FEMALE" | "MALE" | "NEUTRAL"
  ): Promise<TtsEngine | null> {
    let res: Response;
    try {
      res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang, rate, gender }),
      });
    } catch {
      return null;
    }
    if (res.status === 501) return null;
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.audio) return null;
    const mime = (data.mimeType as string) || "audio/mpeg";
    const bin = Uint8Array.from(atob(data.audio as string), (c) => c.charCodeAt(0));
    const blob = new Blob([bin], { type: mime });
    const url = URL.createObjectURL(blob);
    if (!this.audioRef) {
      this.audioRef = document.createElement("audio");
      this.audioRef.style.display = "none";
      document.body.appendChild(this.audioRef);
    }
    const el = this.audioRef;
    el.onended = () => {
      URL.revokeObjectURL(url);
      this.onEnd?.();
    };
    el.src = url;
    try {
      await el.play();
    } catch {
      return null;
    }
    if (data.engine === "edge") return "edge";
    return (data.engine as TtsEngine) === "gemini" ? "gemini" : "google";
  }

  private browserSpeak(text: string, lang: string, rate: number) {
    if (!this.synth) return;
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang;
    u.rate = rate;
    const voice = this.pickVoice();
    if (voice) u.voice = voice;
    u.onend = () => this.onEnd?.();
    this.utterance = u;
    this.synth.speak(u);
  }

  private pickVoice(): SpeechSynthesisVoice | null {
    if (!this.synth) return null;
    const voices = this.synth.getVoices();
    const en = voices.filter((v) => v.lang?.toLowerCase().startsWith("en"));
    if (!en.length) return null;
    const preferred = [
      "Google US English",
      "Google UK English Female",
      "Google UK English Male",
      "Microsoft Aria",
      "Microsoft Jenny",
      "Microsoft Michelle",
      "Samantha",
      "Microsoft Zira",
    ];
    for (const p of preferred) {
      const hit = en.find((v) => v.name.toLowerCase().includes(p.toLowerCase()));
      if (hit) return hit;
    }
    return en[0];
  }

  pause() {
    if (this.mode !== "browser") {
      this.audioRef?.pause();
    } else {
      this.synth?.pause();
    }
  }

  resume() {
    if (this.mode !== "browser") {
      this.audioRef?.play().catch(() => {});
    } else {
      this.synth?.resume();
    }
  }

  get isRemote() {
    return this.mode !== "browser";
  }

  get duration(): number {
    return this.audioRef && Number.isFinite(this.audioRef.duration) ? this.audioRef.duration : 0;
  }

  get currentTime(): number {
    return this.audioRef && Number.isFinite(this.audioRef.currentTime) ? this.audioRef.currentTime : 0;
  }

  seek(seconds: number) {
    if (this.audioRef && Number.isFinite(this.audioRef.duration)) {
      const t = Math.max(0, Math.min(seconds, this.audioRef.duration));
      this.audioRef.currentTime = t;
    }
  }

  onTimeUpdate(fn: (() => void) | null) {
    if (this.audioRef) this.audioRef.ontimeupdate = fn;
  }

  cancel() {
    this.synth?.cancel();
    if (this.audioRef) {
      this.audioRef.pause();
      this.audioRef.onended = null;
    }
  }
}