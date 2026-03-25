
(function () {
  function explain(answer) {
    const reasons = {
      MINI_BILANCINO_MC: "La vittima è bloccata su mancorrente: è l’unica manovra pertinente.",
      DIRETTO_SINGOLA: "Scenario su corda singola senza vincoli critici che escludano il soccorso diretto.",
      DIRETTO_DOPPIA: "Scenario su corda doppia senza vincoli critici che escludano il soccorso diretto.",
      INDIRETTO_SINGOLA: "Scenario critico o più complesso, con corda annessa disponibile su corda singola.",
      INDIRETTO_DOPPIA: "Scenario critico o più complesso, con corda annessa disponibile su corda doppia.",
      PASSAGGIO_NODO: "Scenario pulito su corda singola e vittima gestibile: il passaggio del nodo è la scelta migliore."
    };
    return { answer, reason: reasons[answer] || "Decisione determinata dal motore di regole." };
  }

  function getDifficulty(s) {
    let score = 0;
    if (s.calata === "CASCATA") score += 2;
    if (s.base === "LAGHETTO") score += 1;
    if (s.base === "POZZA_TURBOLENTA") score += 2;
    if (s.sfregamenti) score += 1;
    if (s.vittima === "NON_COLLABORATIVA") score += 1;
    if (s.vittima === "INCOSCIENTE") score += 2;
    if (s.cadutaMassi) score += 2;

    if (score <= 2) return "FACILE";
    if (score <= 5) return "MEDIO";
    return "DIFFICILE";
  }

  function isCriticalScenario(s) {
    return (
      s.calata === "CASCATA" ||
      s.base === "POZZA_TURBOLENTA" ||
      s.sfregamenti === true ||
      s.vittima === "INCOSCIENTE" ||
      s.vittima === "NON_COLLABORATIVA" ||
      s.cadutaMassi === true
    );
  }

  function isCleanScenario(s) {
    return (
      s.calata === "ASCIUTTA" &&
      s.base === "ASCIUTTA" &&
      s.sfregamenti === false &&
      s.vittima === "COSCIENTE" &&
      s.cadutaMassi === false
    );
  }

  function decideManeuver(s) {
    if (s.situation === "MANCORRENTE") {
      return explain("MINI_BILANCINO_MC");
    }

    let candidates = [];
    if (s.situation === "CORDA_SINGOLA") {
      candidates = ["DIRETTO_SINGOLA", "INDIRETTO_SINGOLA", "PASSAGGIO_NODO"];
    }
    if (s.situation === "CORDA_DOPPIA") {
      candidates = ["DIRETTO_DOPPIA", "INDIRETTO_DOPPIA"];
    }

    if (s.calata === "CASCATA") {
      candidates = candidates.filter(a => !a.startsWith("DIRETTO"));
    }
    if (s.cadutaMassi) {
      candidates = candidates.filter(a => !a.startsWith("DIRETTO"));
    }
    if (s.situation !== "CORDA_SINGOLA") {
      candidates = candidates.filter(a => a !== "PASSAGGIO_NODO");
    }
    if (!s.cordaAnnessa) {
      candidates = candidates.filter(a => !a.startsWith("INDIRETTO"));
    }
    if (s.vittima === "INCOSCIENTE") {
      candidates = candidates.filter(a => a !== "PASSAGGIO_NODO");
    }

    if (candidates.length === 0) {
      return { answer: null, reason: "Scenario non utilizzabile: nessuna manovra valida." };
    }
    if (candidates.length === 1) {
      return explain(candidates[0]);
    }

    const critical = isCriticalScenario(s);
    const clean = isCleanScenario(s);

    if (s.situation === "CORDA_SINGOLA") {
      if (candidates.includes("INDIRETTO_SINGOLA") && critical) return explain("INDIRETTO_SINGOLA");
      if (candidates.includes("PASSAGGIO_NODO") && clean) return explain("PASSAGGIO_NODO");
      if (candidates.includes("DIRETTO_SINGOLA")) return explain("DIRETTO_SINGOLA");
      if (candidates.includes("INDIRETTO_SINGOLA")) return explain("INDIRETTO_SINGOLA");
      if (candidates.includes("PASSAGGIO_NODO")) return explain("PASSAGGIO_NODO");
    }

    if (s.situation === "CORDA_DOPPIA") {
      if (candidates.includes("INDIRETTO_DOPPIA") && critical) return explain("INDIRETTO_DOPPIA");
      if (candidates.includes("DIRETTO_DOPPIA") && clean) return explain("DIRETTO_DOPPIA");
      if (candidates.includes("INDIRETTO_DOPPIA")) return explain("INDIRETTO_DOPPIA");
      if (candidates.includes("DIRETTO_DOPPIA")) return explain("DIRETTO_DOPPIA");
    }

    return { answer: null, reason: "Impossibile determinare una risposta univoca." };
  }

  window.RULES = { explain, getDifficulty, isCriticalScenario, isCleanScenario, decideManeuver };
})();
