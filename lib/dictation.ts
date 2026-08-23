import type { Level } from "./learner";

export type Dictation = {
  id: string;
  level: Level;
  title: string;
  text: string;
};

export const DICTATIONS: Dictation[] = [
  {
    id: "d_a1_1",
    level: "A1",
    title: "Mi casa",
    text: "My name is Ana. I live in a small house. My house has two bedrooms and one kitchen. I love my home.",
  },
  {
    id: "d_a1_2",
    level: "A1",
    title: "Un día normal",
    text: "I wake up at seven. I drink coffee and eat breakfast. Then I go to work by bus. I get home at six.",
  },
  {
    id: "d_a1_3",
    level: "A1",
    title: "Mi trabajo",
    text: "I am a teacher. I work in a school near my house. I like my students. They are very kind.",
  },
  {
    id: "d_a2_1",
    level: "A2",
    title: "El viaje",
    text: "Yesterday I went to the beach with my friends. The weather was warm and sunny. We swam in the sea and played with a ball. At the end of the day we had dinner at a nice restaurant.",
  },
  {
    id: "d_a2_2",
    level: "A2",
    title: "La entrevista",
    text: "Last week I had a job interview at a big company. I was nervous, but I answered all the questions well. The manager told me that I was going to start the following Monday. I was very happy.",
  },
  {
    id: "d_a2_3",
    level: "A2",
    title: "Mi semana",
    text: "I usually go to the gym on Mondays and Wednesdays. On weekends I visit my family or watch a movie at home. I don't like waking up early, so I try to sleep well.",
  },
  {
    id: "d_b1_1",
    level: "B1",
    title: "Un nuevo comienzo",
    text: "When I moved to the city, I didn't know anyone. However, after a few weeks I started meeting people at work and at my English class. Little by little, I built a group of friends and the city began to feel like home.",
  },
  {
    id: "d_b1_2",
    level: "B1",
    title: "Decisiones importantes",
    text: "After years of thinking about it, I finally decided to change my career. It was a difficult decision because I was comfortable in my old job. But I knew that if I didn't try, I would always wonder what could have happened. Now I have no regrets.",
  },
  {
    id: "d_b2_1",
    level: "B2",
    title: "El futuro del trabajo",
    text: "The way we work has changed dramatically over the past decade. Remote work, once a rare exception, has become the norm for many companies. While this offers flexibility, it also brings challenges such as loneliness and the difficulty of separating work from personal life. Finding the right balance is essential.",
  },
  {
    id: "d_b2_2",
    level: "B2",
    title: "Aprendizaje continuo",
    text: "Learning does not end when we finish school. In today's world, new skills become necessary faster than ever. Professionals who invest in their education, whether through courses or practical experience, are better prepared to face the challenges of an uncertain economy. Curiosity is the key to staying relevant.",
  },
  {
    id: "d_c1_1",
    level: "C1",
    title: "El papel de la tecnología",
    text: "Although technology has undoubtedly improved our lives in countless ways, it has also raised complex questions about privacy and human connection. We communicate more than ever before, yet many people feel increasingly isolated. The challenge lies not in rejecting innovation, but in using it thoughtfully to strengthen our relationships rather than replace them.",
  },
  {
    id: "d_c1_2",
    level: "C1",
    title: "Perspectiva histórica",
    text: "History teaches us that societies seldom change without resistance. Significant progress, whether social or scientific, has always been the product of persistent effort and occasional failure. Those who study the past understand that lasting change requires patience, collaboration, and a willingness to learn from mistakes.",
  },
];

export function dictationsForLevel(level: Level): Dictation[] {
  return DICTATIONS.filter((d) => d.level === level);
}

export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

export type WordResult = { word: string; status: "ok" | "wrong" | "missing" };

export type DictationResult = {
  wer: number;
  correct: number;
  wrong: number;
  missing: number;
  extra: number;
  refWords: WordResult[];
};

function wordLevDist(a: string[], b: string[]): { ref: WordResult[]; extra: number } {
  const n = a.length;
  const m = b.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i][0] = i;
  for (let j = 0; j <= m; j++) dp[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  const ref: WordResult[] = new Array(m).fill({ word: "", status: "wrong" });
  let extra = 0;
  let i = n;
  let j = m;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && dp[i][j] === dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
      ref[j - 1] = { word: b[j - 1], status: a[i - 1] === b[j - 1] ? "ok" : "wrong" };
      i--;
      j--;
    } else if (i > 0 && dp[i][j] === dp[i - 1][j] + 1) {
      extra++;
      i--;
    } else {
      ref[j - 1] = { word: b[j - 1], status: "missing" };
      j--;
    }
  }
  return { ref, extra };
}

export function compareDictation(userText: string, reference: string): DictationResult {
  const user = normalizeWords(userText);
  const ref = normalizeWords(reference);
  const { ref: refWords, extra } = wordLevDist(user, ref);
  const correct = refWords.filter((w) => w.status === "ok").length;
  const wrong = refWords.filter((w) => w.status === "wrong").length;
  const missing = refWords.filter((w) => w.status === "missing").length;
  const totalErrors = wrong + missing + extra;
  const wer = ref.length ? totalErrors / ref.length : 0;
  return { wer, correct, wrong, missing, extra, refWords };
}

export function werLabel(wer: number): string {
  if (wer <= 0.1) return "Excelente";
  if (wer <= 0.25) return "Bueno";
  if (wer <= 0.4) return "Regular";
  return "Necesitas practicar";
}

export function listensAllowed(level: Level): number {
  return level === "A1" ? 3 : level === "A2" ? 2 : 1;
}
