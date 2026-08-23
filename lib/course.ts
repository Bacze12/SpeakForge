import type { Level } from "./learner";

export type CourseLesson = {
  id: string;
  title: string;
  level: Level;
  description: string;
  concepts: string[];
};

export const LESSONS: CourseLesson[] = [
  {
    id: "l01_presentarse",
    title: "Presentarse y el verbo TO BE",
    level: "A1",
    description: "Presentarte, decir de dónde eres y a qué te dedicas. Base para toda conversación.",
    concepts: ["to_be", "personal_pronouns"],
  },
  {
    id: "l02_to_be_corto",
    title: "TO BE en forma corta (I'm, you're, it's)",
    level: "A1",
    description: "Usar las contracciones del verbo to be, como se habla de verdad.",
    concepts: ["to_be_contractions"],
  },
  {
    id: "l03_posesivos_basicos",
    title: "Posesivos básicos (my, your, his, her)",
    level: "A1",
    description: "Decir de quién es cada cosa y hacer preguntas con to be.",
    concepts: ["possessive_basic"],
  },
  {
    id: "l04_wh_to_be",
    title: "Preguntas WH- con TO BE",
    level: "A1",
    description: "Preguntar dónde estás y qué haces usando what, where + to be.",
    concepts: ["wh_to_be"],
  },
  {
    id: "l05_why_because",
    title: "WHY y BECAUSE",
    level: "A1",
    description: "Preguntar por qué y explicar las razones de lo que dices.",
    concepts: ["why_because"],
  },
  {
    id: "l06_a_an",
    title: "A vs AN (artículos)",
    level: "A1",
    description: "Elegir el artículo correcto según el sonido: a dog, an apple.",
    concepts: ["a_an"],
  },
  {
    id: "l07_there_is_are",
    title: "Describir lugares: THERE IS / THERE ARE",
    level: "A1",
    description: "Describir tu barrio, tu casa y la oficina.",
    concepts: ["there_is_are"],
  },
  {
    id: "l08_adjetivos",
    title: "Adjetivos calificativos",
    level: "A1",
    description: "Enriquecer tus frases: big, small, nice, interesting.",
    concepts: ["adjectives_qualifiers"],
  },
  {
    id: "l09_how_many_much",
    title: "HOW MANY / HOW MUCH",
    level: "A1",
    description: "Preguntar cantidades: cuántas cosas hay y cuánto cuesta.",
    concepts: ["how_many_how_much"],
  },
  {
    id: "l10_this_that",
    title: "THIS / THAT / THESE / THOSE",
    level: "A1",
    description: "Señalar cosas cercanas y lejanas, en singular y plural.",
    concepts: ["this_that_these_those"],
  },
  {
    id: "l11_demostrativos_pregunta",
    title: "Demostrativos en preguntas (Is this…?)",
    level: "A1",
    description: "Preguntar si algo es tuyo o de otra persona.",
    concepts: ["demonstrative_interrogative"],
  },
  {
    id: "l12_present_continuous",
    title: "Present Continuous: lo que pasa ahora",
    level: "A2",
    description: "Hablar de acciones en curso en este momento.",
    concepts: ["present_continuous"],
  },
  {
    id: "l13_present_simple",
    title: "Present Simple: rutinas y trabajo",
    level: "A1",
    description: "Hablar de lo que haces todos los días y en tu trabajo.",
    concepts: ["present_simple"],
  },
  {
    id: "l14_present_simple_aux",
    title: "Present Simple: -S, -ES, -IES y DO/DOES",
    level: "A1",
    description: "Conjugar la tercera persona y hacer preguntas con do/does.",
    concepts: ["present_simple_aux"],
  },
  {
    id: "l15_frecuencia",
    title: "Adverbios de frecuencia",
    level: "A1",
    description: "always, usually, sometimes, never: con qué frecuencia haces cosas.",
    concepts: ["frequency_adverbs"],
  },
  {
    id: "l16_how_often",
    title: "HOW OFTEN",
    level: "A1",
    description: "Preguntar y responder con qué frecuencia haces algo.",
    concepts: ["how_often"],
  },
  {
    id: "l17_preposiciones",
    title: "Preposiciones básicas",
    level: "A1",
    description: "in, on, at, under, next to: situar objetos y lugares.",
    concepts: ["prepositions_basic"],
  },
  {
    id: "l18_wh_questions",
    title: "Preguntas WH- completas",
    level: "A1",
    description: "Todas las palabras pregunta: what, when, where, who, why, how.",
    concepts: ["wh_questions"],
  },
  {
    id: "l19_can",
    title: "CAN: habilidades y pedir ayuda",
    level: "A1",
    description: "Decir qué puedes hacer, pedir ayuda y expresar necesidades.",
    concepts: ["can_ability"],
  },
  {
    id: "l20_adj_adv",
    title: "Adjetivos vs Adverbios",
    level: "A2",
    description: "quick vs quickly: cuándo describir el nombre y cuándo el verbo.",
    concepts: ["adjectives_vs_adverbs"],
  },
  {
    id: "l21_intensificadores",
    title: "Intensificadores (very, really, quite, too)",
    level: "A2",
    description: "Darle fuerza a lo que dices: muy, realmente, demasiado.",
    concepts: ["intensifiers"],
  },
  {
    id: "l22_look_see_watch",
    title: "LOOK / SEE / WATCH",
    level: "A2",
    description: "Las tres formas de 'ver' y cuándo usar cada una.",
    concepts: ["look_see_watch"],
  },
  {
    id: "l23_modales_intro",
    title: "Verbos modales: qué son",
    level: "A2",
    description: "can, could, should, would, must: el sistema de los modales.",
    concepts: ["modal_intro"],
  },
  {
    id: "l24_should",
    title: "SHOULD (deberías)",
    level: "A2",
    description: "Dar consejos y opiniones con el modal should.",
    concepts: ["should"],
  },
  {
    id: "l25_objeto_pronombres",
    title: "Pronombres objeto (me, you, him, her, us, them)",
    level: "A2",
    description: "me, him, her, us, them: el objeto de la acción.",
    concepts: ["object_pronouns"],
  },
  {
    id: "l26_would_like",
    title: "WOULD LIKE (me gustaría)",
    level: "A2",
    description: "Pedir y ofrecer con cortesía: I'd like a coffee.",
    concepts: ["would_like"],
  },
  {
    id: "l27_posesivos_pronombres",
    title: "Pronombres posesivos (mine, yours, his, hers)",
    level: "A2",
    description: "mine, yours, ours: de quién es cada cosa, sin repetir el nombre.",
    concepts: ["possessive_adjectives"],
  },
  {
    id: "l28_what_which",
    title: "WHAT vs WHICH",
    level: "A2",
    description: "Preguntas abiertas (what) vs elegir entre opciones (which).",
    concepts: ["what_vs_which"],
  },
  {
    id: "l29_could",
    title: "COULD (podrías / pasado de can)",
    level: "A2",
    description: "Peticiones corteses y habilidades en el pasado.",
    concepts: ["could"],
  },
  {
    id: "l30_either_neither",
    title: "EITHER / NEITHER",
    level: "A2",
    description: "O… o… y ni… ni… para hablar de dos opciones.",
    concepts: ["either_neither"],
  },
  {
    id: "l31_linking",
    title: "Conectores: AND, BUT, SO, BECAUSE",
    level: "A2",
    description: "Unir ideas y darle fluidez a tus frases.",
    concepts: ["linking"],
  },
  {
    id: "l32_past_to_be",
    title: "Pasado de TO BE (was / were)",
    level: "A2",
    description: "Hablar de dónde estabas y cómo te sentías.",
    concepts: ["past_to_be"],
  },
  {
    id: "l33_past_continuous",
    title: "Past Continuous (was/were + -ing)",
    level: "A2",
    description: "Acciones en curso en el pasado: I was working when…",
    concepts: ["past_continuous"],
  },
  {
    id: "l34_past_simple",
    title: "Past Simple: hablar del pasado",
    level: "A2",
    description: "Contar qué hiciste: verbos regulares e irregulares.",
    concepts: ["past_simple"],
  },
  {
    id: "l35_past_questions",
    title: "Preguntas en pasado (did / was / were)",
    level: "A2",
    description: "Did you…? Were you…? preguntar por eventos pasados.",
    concepts: ["past_simple_questions"],
  },
  {
    id: "l36_subject_object_questions",
    title: "Preguntas de sujeto y objeto (Who…?)",
    level: "A2",
    description: "Quién hizo algo vs a quién le pasó: Who called? Who did you call?",
    concepts: ["subject_object_questions"],
  },
  {
    id: "l37_quantifiers",
    title: "Cuantificadores (some, any, a lot of)",
    level: "A2",
    description: "some, any, much, many: cantidades indefinidas.",
    concepts: ["quantifiers"],
  },
  {
    id: "l38_telling_time",
    title: "Decir la hora",
    level: "A2",
    description: "It's half past, quarter to: hablar de horas.",
    concepts: ["telling_time"],
  },
  {
    id: "l39_time_prepositions",
    title: "Preposiciones de tiempo (at, in, on)",
    level: "A2",
    description: "at 9, on Monday, in July: cuándo pasa cada cosa.",
    concepts: ["time_prepositions"],
  },
  {
    id: "l40_contrast",
    title: "Conectores de contraste (although, however)",
    level: "A2",
    description: "Aunque y sin embargo: contrastar ideas con elegancia.",
    concepts: ["contrast_connectors"],
  },
  {
    id: "l41_future_will_going_to",
    title: "Futuro: WILL vs GOING TO",
    level: "A2",
    description: "Promesas y predicciones con will, planes con going to.",
    concepts: ["future_will_going_to"],
  },
  {
    id: "l42_future_other",
    title: "Otras formas de futuro",
    level: "A2",
    description: "Presente continuo y going to para planes fijos.",
    concepts: ["future_other"],
  },
  {
    id: "b1_l01_present_perfect",
    title: "B1 · Presente Perfecto con HAVE/HAS",
    level: "B1",
    description: "Experiencias de la vida: I have worked, She has been. La puerta a B1.",
    concepts: ["present_perfect"],
  },
  {
    id: "b1_l02_since_for",
    title: "B1 · SINCE vs FOR",
    level: "B1",
    description: "for two years vs since 2020, con presente perfecto.",
    concepts: ["since_for"],
  },
  {
    id: "b1_l03_just_yet",
    title: "B1 · JUST / ALREADY / YET",
    level: "B1",
    description: "I've just arrived, I haven't finished yet.",
    concepts: ["just_already_yet"],
  },
  {
    id: "b1_l04_pp_vs_past",
    title: "B1 · Presente Perfecto vs Pasado Simple",
    level: "B1",
    description: "I have visited (experiencia) vs I visited last year (momento).",
    concepts: ["present_perfect_vs_past_simple"],
  },
  {
    id: "b1_l05_be_able_to",
    title: "B1 · BE ABLE TO, CAN y COULD",
    level: "B1",
    description: "I have been able to… La forma perfecta de 'poder'.",
    concepts: ["be_able_to"],
  },
  {
    id: "b1_l06_ppc",
    title: "B1 · Presente Perfecto Continuo",
    level: "B1",
    description: "I have been working… Enfatiza la duración.",
    concepts: ["present_perfect_continuous"],
  },
  {
    id: "b1_l07_how_long_ppc",
    title: "B1 · HOW LONG en PPC",
    level: "B1",
    description: "How long have you been working? Con for y since.",
    concepts: ["how_long_ppc"],
  },
  {
    id: "b1_l08_there_has_been",
    title: "B1 · THERE HAS/HASN'T BEEN",
    level: "B1",
    description: "There has been a change / There have been problems.",
    concepts: ["there_has_been"],
  },
  {
    id: "b1_l09_past_perfect",
    title: "B1 · Pasado Perfecto",
    level: "B1",
    description: "When I arrived, she had left. La acción anterior a otra en el pasado.",
    concepts: ["past_perfect"],
  },
  {
    id: "b1_l10_past_perfect_cont",
    title: "B1 · Pasado Perfecto Continuo",
    level: "B1",
    description: "I had been working for hours when you called.",
    concepts: ["past_perfect_continuous"],
  },
  {
    id: "b1_l11_future_perfect",
    title: "B1 · Futuro Perfecto",
    level: "B1",
    description: "By Friday I will have finished. Acciones completadas antes de un momento futuro.",
    concepts: ["future_perfect"],
  },
  {
    id: "b1_l12_future_perfect_cont",
    title: "B1 · Futuro Perfecto Continuo",
    level: "B1",
    description: "By 2027 I will have been working here for five years.",
    concepts: ["future_perfect_continuous"],
  },
  {
    id: "b2_l01_relative_clauses",
    title: "B2 · Relative Clauses (who, which, that, whose)",
    level: "B2",
    description: "The woman who works here is my manager.",
    concepts: ["relative_clauses"],
  },
  {
    id: "b2_l02_used_to",
    title: "B2 · USED TO (hábitos del pasado)",
    level: "B2",
    description: "I used to play football. Hábitos que ya no tienes.",
    concepts: ["used_to"],
  },
  {
    id: "b2_l03_there_used_to_be",
    title: "B2 · THERE USED TO BE",
    level: "B2",
    description: "There used to be a cinema here. Solía haber…",
    concepts: ["there_used_to_be"],
  },
  {
    id: "b2_l04_because_as_since",
    title: "B2 · BECAUSE / AS / SINCE / FOR",
    level: "B2",
    description: "Da argumentos sólidos explicando causas.",
    concepts: ["because_as_since_for"],
  },
  {
    id: "b2_l05_classifying_questions",
    title: "B2 · Clasificar preguntas (yes/no vs WH-)",
    level: "B2",
    description: "Reconoce qué respuesta espera cada pregunta.",
    concepts: ["classifying_questions"],
  },
  {
    id: "b2_l06_directions",
    title: "B2 · Puntos cardinales y direcciones",
    level: "B2",
    description: "Go straight, turn left, north/south/east/west.",
    concepts: ["cardinal_directions"],
  },
];

export function lessonById(id: string): CourseLesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

/* ---- Estado derivado de una lección ----
   done:     completada explícitamente o todos sus conceptos con mastery ≥ 0.8.
   optional: nivel de la lección ANTERIOR al nivel diagnosticado del usuario.
             No se cuenta como validada (el diagnóstico no prueba todo el
             contenido previo), pero tampoco bloquea: se puede validar rápido.
   pending:  lección por trabajar del nivel actual o superior. */
export type LessonStatus = "done" | "optional" | "pending";

const COURSE_ORDER = ["A1", "A2", "B1", "B2", "C1", "C2"];

export function lessonStatus(
  lessonLevel: Level,
  userLevel: Level,
  explicitDone: boolean,
  conceptMasteries: number[]
): LessonStatus {
  if (
    explicitDone ||
    (conceptMasteries.length > 0 && conceptMasteries.every((m) => m >= 0.8))
  ) {
    return "done";
  }
  if (COURSE_ORDER.indexOf(lessonLevel) < COURSE_ORDER.indexOf(userLevel)) {
    return "optional";
  }
  return "pending";
}