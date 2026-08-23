import {
  contentLengthTooLarge,
  isTextWithinLimit,
  MAX_TTS_CHARS,
} from "@/lib/apiGuards";

import { NextResponse } from "next/server";

function pcmToWav(pcm: Uint8Array, sampleRate = 24000): Uint8Array {
  const dataSize = pcm.length;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeStr = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++)
      view.setUint8(offset + i, str.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);
  new Uint8Array(buffer).set(pcm, 44);
  return new Uint8Array(buffer);
}

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function geminiTts(
  text: string,
  rate: number,
): Promise<{ audio: string; mimeType: string } | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const voice = process.env.GEMINI_VOICE || "Aoede";
  const speed =
    rate <= 0.7
      ? "very slowly"
      : rate < 1
        ? "slowly"
        : rate > 1
          ? "a little faster"
          : "at a natural pace";
  const models = [
    process.env.GEMINI_TTS_MODEL,
    "gemini-3.1-flash-tts-preview",
    "gemini-2.5-flash-preview-tts",
    process.env.GEMINI_MODEL,
  ].filter((m): m is string => !!m);
  let lastErr = "";
  for (const model of models) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                role: "user",
                parts: [
                  {
                    text: `Say the following text aloud, ${speed}, exactly as written, nothing else:\n"${text}"`,
                  },
                ],
              },
            ],
            generationConfig: {
              responseModalities: ["AUDIO"],
              speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
              },
            },
          }),
        },
      );
      if (!res.ok) {
        const err = await res.text();
        lastErr = `Gemini TTS ${model} ${res.status}: ${err}`;
        continue;
      }
      const data = await res.json();
      const part = data?.candidates?.[0]?.content?.parts?.find(
        (p: any) => p?.inlineData?.data,
      );
      if (!part?.inlineData?.data) {
        lastErr = `Gemini TTS ${model}: sin audio en la respuesta`;
        continue;
      }
      const mime = part.inlineData.mimeType || "audio/L16;rate=24000";
      const b64 = part.inlineData.data as string;
      const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      if (/pcm|L16|audio\/raw/i.test(mime)) {
        return { audio: toBase64(pcmToWav(bin)), mimeType: "audio/wav" };
      }
      return { audio: b64, mimeType: mime };
    } catch (e) {
      lastErr = String(e);
    }
  }
  throw new Error(lastErr || "Gemini TTS no devolvió audio");
}

async function googleCloudTts(
  text: string,
  lang: string,
  rate: number,
  gender: "FEMALE" | "MALE" | "NEUTRAL",
): Promise<string | null> {
  const key = process.env.GOOGLE_TTS_API_KEY;
  if (!key) return null;
  const res = await fetch(
    `https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        input: { text },
        voice: { languageCode: lang, ssmlGender: gender },
        audioConfig: { audioEncoding: "MP3", speakingRate: rate, pitch: 0 },
      }),
    },
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.audioContent || null;
}

async function edgeTts(
  text: string,
  rate: number,
): Promise<{ audio: string; mimeType: string } | null> {
  try {
    const { MsEdgeTTS } = await import("msedge-tts");
    const { OUTPUT_FORMAT } = await import("msedge-tts");
    const tts = new MsEdgeTTS();
    await tts.setMetadata(
      "en-US-JennyNeural",
      OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3,
    );
    const { audioStream } = tts.toStream(text, { rate });
    const chunks: Buffer[] = [];
    for await (const chunk of audioStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    tts.close();
    const buf = Buffer.concat(chunks);
    if (!buf.length) return null;
    return { audio: buf.toString("base64"), mimeType: "audio/mpeg" };
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  if (contentLengthTooLarge(req, 32 * 1024)) {
    return NextResponse.json(
      { error: "El texto es demasiado grande." },
      { status: 413 },
    );
  }
  let text = "";
  let lang = "en-US";
  let rate = 1;
  let gender: "FEMALE" | "MALE" | "NEUTRAL" = "FEMALE";
  try {
    const body = await req.json();
    text = String(body.text || "");
    lang = String(body.lang || "en-US");
    rate = Number(body.rate) || 1;
    if (body.gender === "MALE" || body.gender === "NEUTRAL")
      gender = body.gender;
  } catch {
    // use defaults
  }
  if (!isTextWithinLimit(text, MAX_TTS_CHARS)) {
    return NextResponse.json({ error: "No text" }, { status: 400 });
  }

  const edge = await edgeTts(text, rate);
  if (edge) {
    return NextResponse.json({
      audio: edge.audio,
      mimeType: edge.mimeType,
      engine: "edge",
    });
  }

  if (process.env.GEMINI_API_KEY) {
    try {
      const gem = await geminiTts(text, rate);
      if (gem) {
        return NextResponse.json({
          audio: gem.audio,
          mimeType: gem.mimeType,
          engine: "gemini",
        });
      }
    } catch (e) {
      return NextResponse.json(
        { error: `Gemini TTS falló: ${String(e)}` },
        { status: 502 },
      );
    }
  }

  const cloud = await googleCloudTts(text, lang, rate, gender);
  if (cloud) {
    return NextResponse.json({
      audio: cloud,
      mimeType: "audio/mpeg",
      engine: "google",
    });
  }

  return NextResponse.json(
    { error: "No se pudo generar audio. Se usará la voz del navegador." },
    { status: 501 },
  );
}
