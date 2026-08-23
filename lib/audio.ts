const SAMPLE_RATE = 16000;
const BUFFER_SIZE = 2048;

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private processor: ScriptProcessorNode | null = null;
  private micEnabled = false;
  private onAudioChunk: (base64: string) => void = () => {};
  private isCapturing = false;
  private activeSources = new Set<AudioBufferSourceNode>();
  private queue: { data: ArrayBuffer; rate: number }[] = [];
  private endTime = 0;
  private scheduling = false;
  private muted = false;

  async init(): Promise<void> {
    if (this.ctx) return;
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctx({ sampleRate: SAMPLE_RATE });
  }

  async resume() {
    try {
      await this.ctx?.resume();
    } catch {
      // ignore
    }
  }

  async startMic(onChunk: (base64: string) => void): Promise<void> {
    this.onAudioChunk = onChunk;
    if (!this.ctx) await this.init();
    await this.resume();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true,
      },
    });
    this.source = this.ctx!.createMediaStreamSource(this.stream);
    this.processor = this.ctx!.createScriptProcessor(BUFFER_SIZE, 1, 1);
    this.processor.onaudioprocess = (e) => this.handleAudioProcess(e);
    this.source.connect(this.processor);
    this.processor.connect(this.ctx!.destination);
    this.micEnabled = true;
    this.isCapturing = true;
  }

  private handleAudioProcess(e: AudioProcessingEvent) {
    if (!this.isCapturing) return;
    const input = e.inputBuffer.getChannelData(0);
    const pcm = this.floatToPcm16(input);
    this.onAudioChunk(pcm);
  }

  setCapturing(capturing: boolean) {
    this.isCapturing = capturing;
  }

  stopMic() {
    this.isCapturing = false;
    this.processor?.disconnect();
    this.source?.disconnect();
    this.processor = null;
    this.source = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.micEnabled = false;
  }

  private floatToPcm16(input: Float32Array): string {
    const buffer = new ArrayBuffer(input.length * 2);
    const view = new DataView(buffer);
    for (let i = 0; i < input.length; i++) {
      let s = Math.max(-1, Math.min(1, input[i]));
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(i * 2, s, true);
    }
    let binary = "";
    const chunk = 0x8000;
    const bytes = new Uint8Array(buffer);
    for (let i = 0; i < bytes.length; i += chunk) {
      binary += String.fromCharCode.apply(null, Array.from(bytes.subarray(i, i + chunk)));
    }
    return btoa(binary);
  }

  enqueuePcmAudio(base64: string, mimeType = "audio/pcm") {
    if (this.muted) return;
    const rateMatch = mimeType.match(/rate=(\d+)/);
    const rate = rateMatch ? parseInt(rateMatch[1], 10) : SAMPLE_RATE;
    const bytes = atob(base64);
    const len = bytes.length;
    const buf = new ArrayBuffer(len);
    const view = new Uint8Array(buf);
    for (let i = 0; i < len; i++) view[i] = bytes.charCodeAt(i);
    this.queue.push({ data: buf, rate });
    this.pump();
  }

  private pump() {
    if (!this.ctx || this.scheduling) return;
    this.scheduling = true;
    try {
      while (this.queue.length) {
        const item = this.queue.shift();
        if (!item) break;
        const int16 = new Int16Array(item.data);
        const float = new Float32Array(int16.length);
        for (let i = 0; i < int16.length; i++) {
          float[i] = int16[i] / (int16[i] < 0 ? 0x8000 : 0x7fff);
        }
        const audioBuffer = this.ctx.createBuffer(1, float.length, item.rate);
        audioBuffer.copyToChannel(float, 0);
        const source = this.ctx.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(this.ctx.destination);
        const startAt = Math.max(this.ctx.currentTime, this.endTime);
        source.start(startAt);
        this.endTime = startAt + audioBuffer.duration;
        this.activeSources.add(source);
        source.onended = () => this.activeSources.delete(source);
      }
    } finally {
      this.scheduling = false;
    }
  }

  stopPlayback() {
    for (const s of Array.from(this.activeSources)) {
      try {
        s.stop();
      } catch {
        // ignore
      }
    }
    this.activeSources.clear();
    this.queue = [];
    this.endTime = 0;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
  }

  dispose() {
    this.stopPlayback();
    this.stopMic();
    this.ctx?.close();
    this.ctx = null;
  }
}