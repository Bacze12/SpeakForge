import {
  generateSentence,
  type GeneratedSentence,
  type SentenceRequest,
  type SentenceTemplateId,
} from "./sentenceGenerator";

export type SegmentStatus = "correct" | "missing" | "incorrect" | "acceptable";
export type SegmentErrorType =
  | "missing_auxiliary"
  | "wrong_auxiliary"
  | "missing_going_to"
  | "wrong_modal"
  | "wrong_verb_form"
  | "verb_after_going_to"
  | "duplicate_to"
  | "word_order"
  | "missing_segment";

export type SegmentResult = {
  segmentId: string;
  expected: string;
  actual: string;
  status: SegmentStatus;
  errorType?: SegmentErrorType;
  correction?: string;
  explanation?: string;
};

export type EvaluationResult = {
  template: SentenceTemplateId;
  input: string;
  normalizedInput: string;
  expected: string;
  success: boolean;
  segments: readonly SegmentResult[];
  primaryError?: {
    type: SegmentErrorType;
    segmentId: string;
    wrong: string;
    correct: string;
    why: string;
  };
};

export function normalizeSentence(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[.!?,;:]+$/g, "")
    .replace(/\b(i'm)\b/g, "i am")
    .replace(/\b(you're)\b/g, "you are")
    .replace(/\b(he's|she's|it's)\b/g, (match) =>
      match[0] === "i" ? match : `${match[0]} is`,
    )
    .replace(/\b(we're)\b/g, "we are")
    .replace(/\b(they're)\b/g, "they are")
    .replace(/\s+/g, " ");
}

function tokens(input: string): string[] {
  return normalizeSentence(input).split(" ").filter(Boolean);
}

function verbFormError(
  template: SentenceTemplateId,
  actual: string,
): SegmentErrorType | undefined {
  if (template === "going_to" && /(?:s|ed|ing)$/i.test(actual))
    return "verb_after_going_to";
  if (
    (template === "will" || template === "modal") &&
    /(?:s|ed|ing)$/i.test(actual)
  )
    return "wrong_verb_form";
  return undefined;
}

function makePrimaryError(
  result: SegmentResult,
): EvaluationResult["primaryError"] {
  return {
    type: result.errorType || "missing_segment",
    segmentId: result.segmentId,
    wrong: result.actual || "(falta)",
    correct: result.correction || result.expected,
    why:
      result.explanation ||
      "Esta parte debe seguir el patrón que estás practicando.",
  };
}

export function evaluateSentence(
  input: string,
  expected: GeneratedSentence | SentenceRequest,
): EvaluationResult {
  const generated =
    "segments" in expected ? expected : generateSentence(expected);
  const actual = tokens(input);
  const expectedTokens = generated.segments.flatMap((segment) =>
    segment.text.split(" "),
  );
  const results: SegmentResult[] = [];
  let cursor = 0;

  for (const segment of generated.segments) {
    const segmentTokens = segment.text.split(" ");
    const observed = actual.slice(cursor, cursor + segmentTokens.length);
    const observedText = observed.join(" ");
    const expectedText = segment.text.toLowerCase();
    const observedNormalized = observedText.toLowerCase();

    if (observedNormalized === expectedText) {
      results.push({
        segmentId: segment.id,
        expected: segment.text,
        actual: observedText,
        status: "correct",
      });
      cursor += segmentTokens.length;
      continue;
    }

    if (segment.id === "be" && observed.length === 0) {
      results.push({
        segmentId: segment.id,
        expected: segment.text,
        actual: "",
        status: "missing",
        errorType: "missing_auxiliary",
        correction: segment.text,
        explanation: "Después del sujeto necesitas am, is o are.",
      });
      continue;
    }

    if (
      segment.id === "be" &&
      segment.text !== observedNormalized &&
      observedNormalized === "going"
    ) {
      results.push({
        segmentId: segment.id,
        expected: segment.text,
        actual: "",
        status: "missing",
        errorType: "missing_auxiliary",
        correction: segment.text,
        explanation: "Después del sujeto necesitas am, is o are.",
      });
      continue;
    }

    if (segment.id === "be") {
      results.push({
        segmentId: segment.id,
        expected: segment.text,
        actual: observedText,
        status: "incorrect",
        errorType: "wrong_auxiliary",
        correction: segment.text,
        explanation: `Con ese sujeto usamos ${segment.text}.`,
      });
      cursor += observed.length;
      continue;
    }

    if (segment.text === "going to" && observed.length === 0) {
      results.push({
        segmentId: segment.id,
        expected: segment.text,
        actual: "",
        status: "missing",
        errorType: "missing_going_to",
        correction: segment.text,
        explanation: "Esta estructura necesita going to antes del verbo base.",
      });
      continue;
    }

    if (segment.id === "modal" && observed.length === 0) {
      results.push({
        segmentId: segment.id,
        expected: segment.text,
        actual: "",
        status: "missing",
        errorType: "wrong_modal",
        correction: segment.text,
        explanation: `Usa el modal ${segment.text} para expresar esta idea.`,
      });
      continue;
    }

    if (segment.id === "modal" && observedNormalized === "to") {
      results.push({
        segmentId: segment.id,
        expected: segment.text,
        actual: observedText,
        status: "incorrect",
        errorType: "duplicate_to",
        correction: segment.text,
        explanation: `Después de ${segment.text} usamos el verbo base sin to.`,
      });
      cursor += observed.length;
      continue;
    }

    if (segment.id === "verb") {
      if (
        (generated.template === "will" || generated.template === "modal") &&
        observedNormalized === "to"
      ) {
        results.push({
          segmentId: segment.id,
          expected: segment.text,
          actual: observedText,
          status: "incorrect",
          errorType: "duplicate_to",
          correction: segment.text,
          explanation:
            "Después de will o de un modal usamos el verbo base sin to.",
        });
        cursor += observed.length;
        continue;
      }
      if (generated.template === "present_simple" && observed.length > 0) {
        results.push({
          segmentId: segment.id,
          expected: segment.text,
          actual: observedText,
          status: "incorrect",
          errorType: "wrong_verb_form",
          correction: segment.text,
          explanation:
            "Con he, she o it el verbo lleva la forma de tercera persona.",
        });
        cursor += observed.length;
        continue;
      }
      const errorType = verbFormError(generated.template, observedText);
      if (errorType) {
        results.push({
          segmentId: segment.id,
          expected: segment.text,
          actual: observedText,
          status: "incorrect",
          errorType,
          correction: segment.text,
          explanation:
            generated.template === "going_to"
              ? "Después de going to usamos el verbo base."
              : "Después de will o de un modal usamos el verbo base.",
        });
        cursor += observed.length;
        continue;
      }
    }

    results.push({
      segmentId: segment.id,
      expected: segment.text,
      actual: observedText,
      status: observed.length ? "incorrect" : "missing",
      errorType: observed.length ? "word_order" : "missing_segment",
      correction: segment.text,
      explanation: "Esta parte no coincide con el patrón esperado.",
    });
    cursor += observed.length;
  }

  if (actual.length > expectedTokens.length) {
    results.push({
      segmentId: "extra",
      expected: "",
      actual: actual.slice(expectedTokens.length).join(" "),
      status: "incorrect",
      errorType: "word_order",
      explanation: "Hay una palabra extra en la oración.",
    });
  }

  const primary = results.find(
    (segment) => segment.status === "missing" || segment.status === "incorrect",
  );
  return {
    template: generated.template,
    input,
    normalizedInput: normalizeSentence(input),
    expected: generated.text,
    success: !primary,
    segments: results,
    primaryError: primary ? makePrimaryError(primary) : undefined,
  };
}
