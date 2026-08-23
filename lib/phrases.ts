export type Phrase = { en: string; pr: string; es: string };

export type Level = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1", "C2"];

export const PHRASES: Record<Level, Phrase[]> = {
  A1: [
    { en: "My name is Bruno.", pr: "(mai neim is brúno)", es: "Mi nombre es Bruno." },
    { en: "I am twenty-five years old.", pr: "(ai am twéni-faiv yirs óld)", es: "Tengo veinticinco años." },
    { en: "I live in Santiago.", pr: "(ai liv in sang-tiágo)", es: "Vivo en Santiago." },
    { en: "I work in a company.", pr: "(ai wérk in a kómpani)", es: "Trabajo en una empresa." },
    { en: "I like to learn new things.", pr: "(ai laik tu lérn niu zings)", es: "Me gusta aprender cosas nuevas." },
    { en: "I can work on Saturdays.", pr: "(ai kan wérk on sáturdeis)", es: "Puedo trabajar los sábados." },
    { en: "Nice to meet you.", pr: "(nais tu mít iu)", es: "Mucho gusto." },
    { en: "Thank you for the interview.", pr: "(zánk iu for di ínterviu)", es: "Gracias por la entrevista." },
  ],
  A2: [
    { en: "I have two years of experience.", pr: "(ai jav tú yirs of ex-pí-riens)", es: "Tengo dos años de experiencia." },
    { en: "I studied business at the university.", pr: "(ai stádi bísnes at da iuni-vérsiti)", es: "Estudié negocios en la universidad." },
    { en: "I am responsible and punctual.", pr: "(ai am res-pón-sibel and pánktiual)", es: "Soy responsable y puntual." },
    { en: "I can work in a team.", pr: "(ai kan wérk in a tím)", es: "Puedo trabajar en equipo." },
    { en: "My main strength is attention to detail.", pr: "(mai mein strenz is a-ténshon tu di-téil)", es: "Mi principal fortaleza es la atención al detalle." },
    { en: "I want to improve my English.", pr: "(ai want tu im-prúv mai ínglish)", es: "Quiero mejorar mi inglés." },
    { en: "Can you repeat the question, please?", pr: "(kan iu ri-pít da kués-chon plis)", es: "¿Puedes repetir la pregunta, por favor?" },
    { en: "I am looking for a new challenge.", pr: "(ai am lúkin for a niu chá-lensh)", es: "Estoy buscando un nuevo desafío." },
  ],
  B1: [
    { en: "I have been working as a QA analyst for three years.", pr: "(ai jav bin wérkin as a kiu-ei ánalist for zrí yirs)", es: "He trabajado como analista QA por tres años." },
    { en: "I enjoy solving problems under pressure.", pr: "(ai en-yói sól-vin próblems án-der pré-sher)", es: "Disfruto resolver problemas bajo presión." },
    { en: "I am good at communicating with clients.", pr: "(ai am gud at ko-miú-nikeitin wiz kláients)", es: "Soy bueno comunicándome con clientes." },
    { en: "One of my weaknesses is public speaking.", pr: "(uan of mai wík-neses is páb-lik spí-kin)", es: "Una de mis debilidades es hablar en público." },
    { en: "I would like to grow within the company.", pr: "(ai wud laik tu gróu wi-zin da kómpani)", es: "Me gustaría crecer dentro de la empresa." },
    { en: "Could you tell me more about the role?", pr: "(kud iu tel mi mor a-báut da róul)", es: "¿Podrías contarme más sobre el puesto?" },
    { en: "I handle stress by organizing my tasks.", pr: "(ai ján-del stres bai órganaisin mai tasks)", es: "Manejo el estrés organizando mis tareas." },
    { en: "What are the next steps in the process?", pr: "(uat ar da néxt steps in da pró-ses)", es: "¿Cuáles son los siguientes pasos del proceso?" },
  ],
  B2: [
    { en: "I am responsible for leading a small team.", pr: "(ai am res-pón-sibel for lí-din a smol tím)", es: "Soy responsable de liderar un pequeño equipo." },
    { en: "I implemented automated tests that reduced errors by thirty percent.", pr: "(ai ímplementeid áutoméitid tests zat ri-diúsd érors bai zér-ti per-sént)", es: "Implementé pruebas automatizadas que redujeron los errores en un treinta por ciento." },
    { en: "I am confident in my ability to learn quickly.", pr: "(ai am kónfident in mai a-bí-liti tu lérn kuík-li)", es: "Confío en mi capacidad de aprender rápido." },
    { en: "I believe my adaptability sets me apart.", pr: "(ai bi-lív mai ada-pta-bí-liti sets mi a-párt)", es: "Creo que mi adaptabilidad me distingue." },
    { en: "I am looking for a position where I can contribute strategically.", pr: "(ai am lúkin for a po-síshon uér ai kan kon-tri-biút stra-tí-yikli)", es: "Busco un puesto donde pueda aportar estratégicamente." },
    { en: "How would you describe the company culture?", pr: "(jau wud iu dis-kráib da kómpani kúl-cher)", es: "¿Cómo describirías la cultura de la empresa?" },
    { en: "I am comfortable working with remote teams.", pr: "(ai am kómfortábol wérkin wiz ri-móut tímz)", es: "Me siento cómodo trabajando con equipos remotos." },
    { en: "What challenges is the team currently facing?", pr: "(uat chá-len-ches is da tím kér-ent-li féisin)", es: "¿Qué desafíos enfrenta el equipo actualmente?" },
  ],
  C1: [
    { en: "My professional background aligns closely with the requirements.", pr: "(mai pro-féshonal bák-graund a-láins klóus-li wiz da ri-kuáir-ments)", es: "Mi trayectoria profesional se alinea con los requisitos." },
    { en: "I have demonstrated measurable impact through process optimization.", pr: "(ai jav démonstréited méshurabol impáct zuru pró-ses opti-mai-séishon)", es: "He demostrado un impacto medible mediante la optimización de procesos." },
    { en: "I thrive in ambiguous situations and enjoy structuring problems.", pr: "(ai zráiv in am-bíguas situ-éishons and en-yói strák-churin próblems)", es: "Prospero en situaciones ambiguas y disfruto estructurar problemas." },
    { en: "A weakness I am actively addressing is delegating tasks effectively.", pr: "(a wík-nes ai am áktifli a-dré-sin is déle-guéitin tasks e-fék-tifli)", es: "Una debilidad que estoy trabajando es delegar tareas de forma eficaz." },
    { en: "I am seeking a role where I can leverage my analytical expertise.", pr: "(ai am sí-kin a róul uér ai kan lé-vé-rich mai ana-lí-tikal ex-pertís)", es: "Busco un rol donde pueda aprovechar mi experiencia analítica." },
    { en: "Could you elaborate on the performance metrics for this role?", pr: "(kud iu e-láboreit on da per-fórmans métriks for zis róul)", es: "¿Podrías ampliar sobre las métricas de rendimiento del puesto?" },
    { en: "I am particularly interested in the scalability challenges mentioned.", pr: "(ai am par-tí-kiularli ínterested in da skeila-bí-liti chá-len-ches mén-shond)", es: "Me interesa especialmente el desafío de escalabilidad mencionado." },
    { en: "I would welcome the opportunity to contribute from day one.", pr: "(ai wud uél-kom da oportú-niti tu kon-tri-biút from déi uán)", es: "Aceptaría con gusto la oportunidad de aportar desde el primer día." },
  ],
  C2: [
    { en: "My expertise spans strategy, operations, and people management.", pr: "(mai ex-pertís spans strá-teyi, opa-réishons, and pípel máneshment)", es: "Mi experiencia abarca estrategia, operaciones y gestión de personas." },
    { en: "I have a proven track record of driving transformation in mature organizations.", pr: "(ai jav a prúven trak ré-kord of drái-vin transfor-méishon in ma-túr organi-séishons)", es: "Tengo un historial demostrado impulsando transformaciones en organizaciones maduras." },
    { en: "I excel at aligning cross-functional teams toward a common goal.", pr: "(ai ex-sél at a-láinin kros-fánshonal tímz tuárd a kómon góul)", es: "Soy excelente alineando equipos multifuncionales hacia un objetivo común." },
    { en: "My leadership style is collaborative, data-driven, and outcome-focused.", pr: "(mai lí-der-ship stáil is ko-láboratif, deita-dríven, and áutkam-fóukust)", es: "Mi estilo de liderazgo es colaborativo, basado en datos y orientado a resultados." },
    { en: "I am adept at navigating complex stakeholder landscapes.", pr: "(ai am a-dépt at návi-gueitin kómples stéik-houler lánd-zuéips)", es: "Soy hábil navegando paisajes complejos de interesados." },
    { en: "How does this organization measure long-term success?", pr: "(jau dás zis or-gani-séishon méshur long-térm suc-sés)", es: "¿Cómo mide esta organización el éxito a largo plazo?" },
    { en: "I am ready to take ownership of high-impact initiatives from the outset.", pr: "(ai am rédi tu téik óuner-shíp of jai-ímpakt ini-siatifs from di áuts-et)", es: "Estoy listo para asumir la responsabilidad de iniciativas de alto impacto desde el inicio." },
    { en: "I would like to align my growth trajectory with the company's strategic vision.", pr: "(ai wud laik tu a-lain mai gróuz tra-yék-tori wiz da kómpanis stra-téyik ví-shon)", es: "Me gustaría alinear mi trayectoria de crecimiento con la visión estratégica de la empresa." },
  ],
};