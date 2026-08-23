import type { ContextId } from "./contexts";
import type { Level } from "./learner";

export type VocabularyCategory =
  | "software"
  | "frontend"
  | "backend"
  | "cloud"
  | "devops"
  | "database"
  | "testing"
  | "support"
  | "interview";

export type PartOfSpeech = "noun" | "verb" | "adjective" | "adverb" | "phrase";

export type VocabularyEntry = {
  id: string;
  lemma: string;
  phrase?: string;
  partOfSpeech: PartOfSpeech;
  level: Level;
  categories: VocabularyCategory[];
  contexts: ContextId[];
  translationEs: string;
  baseForm?: string;
  thirdPersonForm?: string;
  pastForm?: string;
  collocations?: string[];
  examples?: string[];
  countable?: boolean;
};

export const IT_VOCABULARY: readonly VocabularyEntry[] = [
  {
    id: "fix_a_bug",
    lemma: "fix",
    phrase: "fix a bug",
    partOfSpeech: "verb",
    level: "A1",
    categories: ["software", "testing"],
    contexts: ["technology", "work"],
    translationEs: "corregir un error",
    baseForm: "fix",
    thirdPersonForm: "fixes",
    pastForm: "fixed",
    collocations: ["fix a bug", "fix an issue"],
    examples: ["I fix bugs in the application."],
  },
  {
    id: "deploy_a_feature",
    lemma: "deploy",
    phrase: "deploy a feature",
    partOfSpeech: "verb",
    level: "B1",
    categories: ["software", "cloud", "devops"],
    contexts: ["technology", "work"],
    translationEs: "desplegar una funcionalidad",
    baseForm: "deploy",
    thirdPersonForm: "deploys",
    pastForm: "deployed",
    collocations: ["deploy to production", "deploy a feature"],
    examples: ["We are going to deploy a feature tomorrow."],
  },
  {
    id: "review_a_pull_request",
    lemma: "review",
    phrase: "review a pull request",
    partOfSpeech: "verb",
    level: "B1",
    categories: ["software", "testing"],
    contexts: ["technology", "work"],
    translationEs: "revisar una solicitud de cambios",
    baseForm: "review",
    thirdPersonForm: "reviews",
    pastForm: "reviewed",
    collocations: ["review code", "review a pull request"],
    examples: ["She reviews pull requests every morning."],
  },
  {
    id: "update_the_software",
    lemma: "update",
    phrase: "update the software",
    partOfSpeech: "verb",
    level: "A2",
    categories: ["software", "support"],
    contexts: ["technology", "work"],
    translationEs: "actualizar el software",
    baseForm: "update",
    thirdPersonForm: "updates",
    pastForm: "updated",
    collocations: ["update the software", "update an application"],
    examples: ["I am going to update the software tomorrow."],
  },
  {
    id: "database",
    lemma: "database",
    partOfSpeech: "noun",
    level: "A2",
    categories: ["backend", "database"],
    contexts: ["technology", "work"],
    translationEs: "base de datos",
    collocations: ["query a database", "work with a database"],
    examples: ["The application uses a database."],
    countable: true,
  },
  {
    id: "technical_problem",
    lemma: "problem",
    phrase: "technical problem",
    partOfSpeech: "noun",
    level: "A2",
    categories: ["software", "support"],
    contexts: ["technology", "work"],
    translationEs: "problema técnico",
    collocations: ["solve a problem", "technical problem"],
    examples: ["I can solve technical problems."],
    countable: true,
  },
  {
    id: "deadline",
    lemma: "deadline",
    partOfSpeech: "noun",
    level: "A2",
    categories: ["interview", "software"],
    contexts: ["work", "technology"],
    translationEs: "fecha límite",
    collocations: ["meet a deadline", "tight deadline"],
    examples: ["We will meet the deadline."],
    countable: true,
  },
];

export function vocabularyById(id: string): VocabularyEntry | undefined {
  return IT_VOCABULARY.find((entry) => entry.id === id);
}

export function vocabularyForContext(
  context: ContextId,
  level?: Level,
): readonly VocabularyEntry[] {
  return IT_VOCABULARY.filter(
    (entry) =>
      entry.contexts.includes(context) && (!level || entry.level === level),
  );
}

export function vocabularyForCategory(
  category: VocabularyCategory,
  level?: Level,
): readonly VocabularyEntry[] {
  return IT_VOCABULARY.filter(
    (entry) =>
      entry.categories.includes(category) && (!level || entry.level === level),
  );
}

export function compatibleVocabulary(
  options: {
    context?: ContextId;
    level?: Level;
    category?: VocabularyCategory;
  } = {},
): readonly VocabularyEntry[] {
  return IT_VOCABULARY.filter(
    (entry) =>
      (!options.context || entry.contexts.includes(options.context)) &&
      (!options.level || entry.level === options.level) &&
      (!options.category || entry.categories.includes(options.category)),
  );
}
