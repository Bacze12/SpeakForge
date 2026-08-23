import { describe, expect, it } from "vitest";
import { vocabularyById } from "../vocabulary";
import { generateSentence } from "../sentenceGenerator";
import { evaluateSentence, normalizeSentence } from "../segmentEvaluator";

const deploy = vocabularyById("deploy_a_feature");
const update = vocabularyById("update_the_software");

if (!deploy || !update) throw new Error("Test vocabulary is incomplete");

describe("Deterministic sentence generation", () => {
  it("genera going to con auxiliar y verbo base", () => {
    const sentence = generateSentence({
      template: "going_to",
      subject: "I",
      verb: deploy,
      object: "the feature",
      time: "tomorrow",
    });

    expect(sentence.text).toBe("I am going to deploy the feature tomorrow.");
  });

  it("conjuga present simple para tercera persona", () => {
    const sentence = generateSentence({
      template: "present_simple",
      subject: "she",
      verb: update,
      object: "the software",
    });

    expect(sentence.text).toBe("she updates the software.");
  });
});

describe("Segmented sentence evaluation", () => {
  const expected = generateSentence({
    template: "going_to",
    subject: "I",
    verb: deploy,
    object: "the feature",
  });

  it("acepta puntuación, mayúsculas y contracciones", () => {
    const result = evaluateSentence(
      "I'm going to deploy the feature!",
      expected,
    );
    expect(result.success).toBe(true);
    expect(result.primaryError).toBeUndefined();
    expect(normalizeSentence("I'm going to deploy the feature!")).toBe(
      "i am going to deploy the feature",
    );
  });

  it("detecta que falta am/is/are", () => {
    const result = evaluateSentence("I going to deploy the feature", expected);
    expect(result.success).toBe(false);
    expect(result.primaryError?.type).toBe("missing_auxiliary");
    expect(result.primaryError?.correct).toBe("am");
    expect(
      result.segments.find((segment) => segment.segmentId === "be")?.status,
    ).toBe("missing");
  });

  it("detecta un verbo conjugado después de going to", () => {
    const result = evaluateSentence(
      "I am going to deploys the feature",
      expected,
    );
    expect(result.success).toBe(false);
    expect(result.primaryError?.type).toBe("verb_after_going_to");
    expect(result.primaryError?.correct).toBe("deploy");
  });

  it("detecta will seguido de to", () => {
    const result = evaluateSentence("I will to fix the bug", {
      template: "will",
      subject: "I",
      verb: "fix",
      object: "the bug",
    });
    expect(result.success).toBe(false);
    expect(result.primaryError?.type).toBe("duplicate_to");
  });

  it("detecta modal seguido de to", () => {
    const result = evaluateSentence("You should to review the report", {
      template: "modal",
      subject: "you",
      modal: "should",
      verb: "review",
      object: "the report",
    });
    expect(result.success).toBe(false);
    expect(result.primaryError?.type).toBe("duplicate_to");
  });

  it("detecta la tercera persona del presente simple", () => {
    const result = evaluateSentence("She check the app", {
      template: "present_simple",
      subject: "she",
      verb: "check",
      object: "the app",
    });
    expect(result.success).toBe(false);
    expect(result.primaryError?.type).toBe("wrong_verb_form");
    expect(result.primaryError?.correct).toBe("checks");
  });
});
