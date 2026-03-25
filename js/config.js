
window.CONFIG = {
  appVersion: "1.0.0",
  storageKey: "canyonQuizManualScenarios",
  errorKey: "canyonQuizErrors",
  settingsKey: "canyonQuizSettings",
  situations: ["CORDA_SINGOLA", "CORDA_DOPPIA", "MANCORRENTE"],
  calataTypes: ["ASCIUTTA", "CASCATA"],
  baseTypes: ["ASCIUTTA", "LAGHETTO", "POZZA_TURBOLENTA"],
  victimStates: ["COSCIENTE", "INCOSCIENTE", "NON_COLLABORATIVA"],
  answers: [
    "DIRETTO_SINGOLA",
    "DIRETTO_DOPPIA",
    "INDIRETTO_SINGOLA",
    "INDIRETTO_DOPPIA",
    "PASSAGGIO_NODO",
    "MINI_BILANCINO_MC"
  ],
  difficultyLevels: ["FACILE", "MEDIO", "DIFFICILE"],
  defaultSettings: {
    mode: "TRAINING",
    difficulty: "",
    timerSeconds: 15,
    examCount: 10
  }
};
