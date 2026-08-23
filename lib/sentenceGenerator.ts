import type { ContextId } from "./contexts";
import type { Level } from "./learner";
import type { VocabularyEntry } from "./vocabulary";

export type SentenceTemplateId =
  | "going_to"
  | "will"
  | "present_simple"
  | "modal";
export type Subject = "I" | "you" | "he" | "she" | "it" | "we" | "they";
export type Modal = "can" | "could" | "should" | "would" | "must" | "might";

export type SentenceRequest = {
  template: SentenceTemplateId;
  subject: Subject;
  verb: VocabularyEntry | string;
  object?: VocabularyEntry | string;
  modal?: Modal;
  time?: string;
  context?: ContextId;
  level?: Level;
};

export type ExpectedSegment = {
  id: "subject" | "be" | "modal" | "verb" | "object" | "time";
  text: string;
  alternatives?: readonly string[];
  required: boolean;
};

export type GeneratedSentence = {
  template: SentenceTemplateId;
  text: string;
  segments: readonly ExpectedSegment[];
};

export const SENTENCE_TEMPLATES: Readonly<Record<SentenceTemplateId, string>> =
  {
    going_to: "SUBJECT + AM/IS/ARE + GOING TO + BASE VERB + COMPLEMENT",
    will: "SUBJECT + WILL + BASE VERB + COMPLEMENT",
    present_simple: "SUBJECT + BASE VERB / VERB-S + COMPLEMENT",
    modal: "SUBJECT + MODAL + BASE VERB + COMPLEMENT",
  };

function valueOf(value: VocabularyEntry | string | undefined): string {
  if (!value) return "";
  return typeof value === "string" ? value : value.phrase || value.lemma;
}

function baseForm(value: VocabularyEntry | string): string {
  return typeof value === "string"
    ? value.split(/\s+/)[0]
    : value.baseForm || value.lemma;
}

function thirdPerson(value: VocabularyEntry | string): string {
  if (typeof value !== "string" && value.thirdPersonForm)
    return value.thirdPersonForm;
  const base = baseForm(value);
  if (/(s|x|ch|sh|o)$/i.test(base)) return `${base}es`;
  if (/[^aeiou]y$/i.test(base)) return `${base.slice(0, -1)}ies`;
  return `${base}s`;
}

function beFor(subject: Subject): string {
  if (subject === "I") return "am";
  if (["he", "she", "it"].includes(subject)) return "is";
  return "are";
}

function segmentsFor(request: SentenceRequest): ExpectedSegment[] {
  const segments: ExpectedSegment[] = [
    { id: "subject", text: request.subject, required: true },
  ];
  if (request.template === "going_to") {
    segments.push({
      id: "be",
      text: beFor(request.subject),
      alternatives: ["am", "is", "are"],
      required: true,
    });
    segments.push({ id: "verb", text: "going to", required: true });
    segments.push({ id: "verb", text: baseForm(request.verb), required: true });
  } else if (request.template === "will") {
    segments.push({ id: "modal", text: "will", required: true });
    segments.push({ id: "verb", text: baseForm(request.verb), required: true });
  } else if (request.template === "modal") {
    segments.push({
      id: "modal",
      text: request.modal || "should",
      required: true,
    });
    segments.push({ id: "verb", text: baseForm(request.verb), required: true });
  } else {
    segments.push({
      id: "verb",
      text: ["he", "she", "it"].includes(request.subject)
        ? thirdPerson(request.verb)
        : baseForm(request.verb),
      required: true,
    });
  }
  if (request.object)
    segments.push({
      id: "object",
      text: valueOf(request.object),
      required: true,
    });
  if (request.time)
    segments.push({ id: "time", text: request.time, required: false });
  return segments;
}

export function generateSentence(request: SentenceRequest): GeneratedSentence {
  const segments = segmentsFor(request);
  return {
    template: request.template,
    text: segments.map((segment) => segment.text).join(" ") + ".",
    segments,
  };
}
