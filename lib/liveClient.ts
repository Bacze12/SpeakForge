export type LiveMessage = {
  setup?: {
    model: string;
    generationConfig?: {
      responseModalities?: string[];
      speechConfig?: {
        voiceConfig?: {
          prebuiltVoiceConfig?: { voiceName?: string };
        };
      };
    };
    inputAudioTranscription?: Record<string, unknown>;
    outputAudioTranscription?: Record<string, unknown>;
    realtimeInputConfig?: {
      automaticActivityDetection?: { disabled?: boolean };
    };
    systemInstruction?: { parts: { text: string }[] };
  };
  clientContent?: {
    turns: { role: string; parts: { text: string }[] }[];
    turnComplete: boolean;
  };
  realtimeInput?: {
    audio?: { data?: string; mimeType?: string };
    text?: string;
    activityStart?: Record<string, unknown>;
    activityEnd?: Record<string, unknown>;
  };
  clientInterrupted?: boolean;
};

export type ServerMessage = {
  setupComplete?: Record<string, unknown>;
  serverContent?: {
    modelTurn?: {
      parts?: {
        text?: string;
        thought?: boolean;
        inlineData?: { mimeType?: string; data?: string };
      }[];
    };
    inputTranscription?: { text?: string };
    outputTranscription?: { text?: string };
    interrupted?: boolean;
    turnComplete?: boolean;
  };
  goAway?: { reason?: string; message?: string };
  toolCall?: Record<string, unknown>;
};

export type LiveClientCallbacks = {
  onSetupComplete?: () => void;
  onAudio?: (data: string, mimeType: string) => void;
  onInputTranscription?: (text: string) => void;
  onOutputTranscription?: (text: string) => void;
  onTurnComplete?: (isInterrupted: boolean) => void;
  onInterrupted?: () => void;
  onError?: (message: string) => void;
  onClose?: () => void;
};

export class LiveClient {
  private ws: WebSocket | null = null;
  private callbacks: LiveClientCallbacks;

  constructor(callbacks: LiveClientCallbacks) {
    this.callbacks = callbacks;
  }

  connect(apiKey: string, model: string, systemInstruction: string, voice: string) {
    if (!apiKey) {
      this.callbacks.onError?.("Falta la API key. Revisa .env.local");
      return;
    }
    const url = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;
    this.ws = new WebSocket(url);
    this.ws.binaryType = "arraybuffer";

    this.ws.onopen = () => {
      const setup: LiveMessage = {
        setup: {
          model: `models/${model}`,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice || "Aoede" },
              },
            },
          },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          realtimeInputConfig: {
            automaticActivityDetection: { disabled: true },
          },
          systemInstruction: { parts: [{ text: systemInstruction }] },
        },
      };
      this.ws!.send(JSON.stringify(setup));
    };

    this.ws.onmessage = (event) => this.handleMessage(event.data);
    this.ws.onerror = () => this.callbacks.onError?.("Error de conexión con la API de Gemini.");
    this.ws.onclose = () => this.callbacks.onClose?.();
  }

  private handleMessage(data: unknown) {
    let msg: ServerMessage;
    try {
      if (typeof data !== "string") {
        data = new TextDecoder().decode(data as ArrayBuffer);
      }
      msg = JSON.parse(data as string);
    } catch {
      return;
    }

    if (msg.setupComplete) {
      this.callbacks.onSetupComplete?.();
      return;
    }

    if (msg.serverContent) {
      const sc = msg.serverContent;
      if (sc.modelTurn?.parts) {
        for (const part of sc.modelTurn.parts) {
          if (part.inlineData?.data) {
            this.callbacks.onAudio?.(part.inlineData.data, part.inlineData.mimeType || "audio/pcm");
          }
        }
      }
      if (sc.inputTranscription?.text) {
        this.callbacks.onInputTranscription?.(sc.inputTranscription.text);
      }
      if (sc.outputTranscription?.text) {
        this.callbacks.onOutputTranscription?.(sc.outputTranscription.text);
      }
      if (sc.interrupted) {
        this.callbacks.onInterrupted?.();
      }
      if (sc.turnComplete !== undefined) {
        this.callbacks.onTurnComplete?.(!!sc.interrupted);
      }
    }

    if (msg.goAway) {
      this.callbacks.onError?.(msg.goAway.message || "La sesión fue cerrada.");
    }
  }

  sendRealtimeAudio(pcmBase64: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const msg: LiveMessage = {
      realtimeInput: { audio: { data: pcmBase64, mimeType: "audio/pcm;rate=16000" } },
    };
    this.ws.send(JSON.stringify(msg));
  }

  sendActivityStart() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ realtimeInput: { activityStart: {} } }));
  }

  sendActivityEnd() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.ws.send(JSON.stringify({ realtimeInput: { activityEnd: {} } }));
  }

  sendText(text: string) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    this.sendActivityStart();
    this.ws.send(JSON.stringify({ realtimeInput: { text } }));
    this.sendActivityEnd();
  }

  interrupt() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;
    const msg: LiveMessage = { clientInterrupted: true };
    this.ws.send(JSON.stringify(msg));
  }

  close() {
    try {
      this.ws?.close();
    } catch {
      // ignore
    }
    this.ws = null;
  }

  get isOpen() {
    return this.ws?.readyState === WebSocket.OPEN;
  }
}