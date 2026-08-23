import type { Level } from "./learner";

export type MinimalPair = {
  id: string;
  a: string;
  b: string;
  note: string;
};

export type PronSentence = {
  id: string;
  level: Level;
  text: string;
  focus: string;
};

export const MINIMAL_PAIRS: MinimalPair[] = [
  { id: "mp1", a: "ship", b: "sheep", note: "i corta (/ɪ/) vs i larga (/iː/). En español no distinguimos estas dos, es el par más clásico." },
  { id: "mp2", a: "bit", b: "beat", note: "i corta vs i larga. bit = poquito, beat = golpear." },
  { id: "mp3", a: "sit", b: "seat", note: "sit (sentarse) vs seat (asiento). Cuida la i larga." },
  { id: "mp4", a: "bad", b: "bed", note: "a abierta (/æ/) vs e (/e/). bad = malo, bed = cama." },
  { id: "mp5", a: "man", b: "men", note: "man (hombre, singular) vs men (hombres, plural). La /æ/ es abierta." },
  { id: "mp6", a: "full", b: "fool", note: "u corta (/ʊ/) vs u larga (/uː/). full = lleno, fool = tonto." },
  { id: "mp7", a: "cat", b: "cut", note: "a abierta (/æ/) vs u corta (/ʌ/). El sonido central no existe en español." },
  { id: "mp8", a: "write", b: "right", note: "Homófonos: suenan igual, ojo con la escritura. write = escribir, right = correcto/derecha." },
  { id: "mp9", a: "think", b: "sink", note: "th (/θ/) vs s. El sonido /θ/ no existe en español: lengua entre los dientes." },
  { id: "mp10", a: "three", b: "tree", note: "th (/θ/) vs t. three = tres, tree = árbol." },
  { id: "mp11", a: "very", b: "berry", note: "v (/v/) vs b (/b/). En español se confunden; la v es labiodental." },
  { id: "mp12", a: "vote", b: "boat", note: "v vs b. vote = votar, boat = bote." },
  { id: "mp13", a: "rice", b: "rise", note: "s sorda (/s/) vs z sonora (/z/). rice = arroz, rise = subir." },
  { id: "mp14", a: "sheet", b: "seat", note: "sh (/ʃ/) vs s. El sonido /ʃ/ es como 'shhh', no existe en español." },
  { id: "mp15", a: "chips", b: "cheap", note: "ch (/tʃ/) inicial vs la i larga. Practica el sonido de 'ch'." },
];

export const PRON_SENTENCES: PronSentence[] = [
  { id: "ps1", level: "A1", text: "I am a student and I live in a small city.", focus: "to be, adjetivos, vocales cortas" },
  { id: "ps2", level: "A1", text: "She works in a big hospital near the park.", focus: "-s de tercera persona, th, r" },
  { id: "ps3", level: "A1", text: "We have breakfast at seven every morning.", focus: "v, th, consonantes finales" },
  { id: "ps4", level: "A1", text: "They are happy because it is a sunny day.", focus: "th (they), a abierta, y" },
  { id: "ps5", level: "A2", text: "Yesterday I went to the beach with my friends.", focus: "pasado -ed, th, diptongos" },
  { id: "ps6", level: "A2", text: "I usually watch a movie or read a book at home.", focus: "sh (usually), vocales, r" },
  { id: "ps7", level: "A2", text: "She wanted to work in another country next year.", focus: "-ed, th (another), conectores" },
  { id: "ps8", level: "A2", text: "We arrived late because the traffic was terrible.", focus: "-ed (arrived), r, z sonora (was)" },
  { id: "ps9", level: "B1", text: "Although the project was difficult, we finished it on time.", focus: "th (although/the), -ed, r" },
  { id: "ps10", level: "B1", text: "I would rather work from home than spend time commuting.", focus: "would, th (than), enlaces entre palabras" },
  { id: "ps11", level: "B1", text: "The manager explained the new policy during the meeting.", focus: "v, x, th, palabras largas" },
  { id: "ps12", level: "B1", text: "We have been working on this project for three months.", focus: "have been, th (three), conectores" },
];

export function pronSentencesForLevel(level: Level): PronSentence[] {
  return PRON_SENTENCES.filter((p) => p.level === level);
}

export function randomMinimalPair(excludeId?: string): MinimalPair {
  const pool = MINIMAL_PAIRS.filter((p) => p.id !== excludeId);
  return pool[Math.floor(Math.random() * pool.length)] || MINIMAL_PAIRS[0];
}