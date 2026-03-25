(function(){
  const DETAIL_STORAGE_KEY = "canyon_response_detail_overrides_v13";
  const SCENARIO_OVERRIDE_KEY = "canyon_scenario_rule_overrides_v13";

  const DEFAULT_DETAILS = {
    MINI_BILANCINO_MC: "Vittima su mancorrente: unica manovra applicabile.",
    DIRETTO_SINGOLA: "Scenario su singola senza vincoli critici che escludano il diretto.",
    DIRETTO_DOPPIA: "Scenario su doppia senza vincoli critici che escludano il diretto.",
    INDIRETTO_SINGOLA: "Scenario critico su singola con corda annessa e kit-bull sufficienti.",
    INDIRETTO_DOPPIA: "Scenario critico su doppia con corda annessa e kit-bull sufficienti.",
    PASSAGGIO_NODO: "Scenario pulito su singola e passaggio del nodo favorito.",
    SVINCOLO_SOSTA: "Singola svincolabile, vittima cosciente e kit-bull sufficiente.",
    NESSUNA_MANOVRA: "Per questo scenario, escluso il mancorrente, non sono disponibili né corda annessa né kit-bull sufficiente."
  };

  function loadJson(key, fallback){
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch(e){
      return fallback;
    }
  }
  function saveJson(key, obj){ localStorage.setItem(key, JSON.stringify(obj)); }

  function loadDetailOverrides(){ return loadJson(DETAIL_STORAGE_KEY, {}); }
  function saveDetailOverrides(obj){ saveJson(DETAIL_STORAGE_KEY, obj); }
  function clearDetailOverrides(){ localStorage.removeItem(DETAIL_STORAGE_KEY); }

  function loadScenarioOverrides(){ return loadJson(SCENARIO_OVERRIDE_KEY, {}); }
  function saveScenarioOverrides(obj){ saveJson(SCENARIO_OVERRIDE_KEY, obj); }
  function clearScenarioOverrides(){ localStorage.removeItem(SCENARIO_OVERRIDE_KEY); }

  function explain(answer){
    const overrides = loadDetailOverrides();
    return overrides[answer] || DEFAULT_DETAILS[answer] || "Decisione del motore di regole.";
  }

  function getAllDetailTexts(){
    const overrides = loadDetailOverrides();
    const out = {};
    CONFIG.answers.forEach(a => { out[a] = overrides[a] || DEFAULT_DETAILS[a] || ""; });
    return out;
  }

  function setDetailText(answer, text){
    const overrides = loadDetailOverrides();
    overrides[answer] = text;
    saveDetailOverrides(overrides);
  }

  function scenarioSignature(s){
    return [
      s.situation, s.calata, s.base, String(!!s.sfregamenti), String(!!s.cordaAnnessa),
      s.vittima, String(!!s.compagniBase), String(!!s.cadutaMassi), s.cordaMagazzino
    ].join("|");
  }

  function getScenarioOverride(signature){
    const all = loadScenarioOverrides();
    return all[signature] || null;
  }

  function setScenarioOverride(signature, override){
    const all = loadScenarioOverrides();
    all[signature] = override;
    saveScenarioOverrides(all);
  }

  function deleteScenarioOverride(signature){
    const all = loadScenarioOverrides();
    delete all[signature];
    saveScenarioOverrides(all);
  }

  function getDifficulty(s){
    let score = 0;
    if (s.calata === "CASCATA") score += 2;
    if (s.base === "LAGHETTO") score += 1;
    if (s.base === "POZZA_TURBOLENTA") score += 2;
    if (s.sfregamenti) score += 1;
    if (s.vittima === "NON_COLLABORATIVA") score += 1;
    if (s.vittima === "INCOSCIENTE") score += 2;
    if (s.cadutaMassi) score += 2;
    if (s.cordaMagazzino !== "SUFFICIENTE") score += 1;
    if (score <= 2) return "FACILE";
    if (score <= 5) return "MEDIO";
    return "DIFFICILE";
  }

  function isSingleSituation(s){
    return s.situation === "CORDA_SINGOLA_SVINCOLABILE" || s.situation === "CORDA_SINGOLA_NON_SVINCOLABILE";
  }

  function normalizeOverrideLists(override){
    const allowed = Array.isArray(override?.allowed) ? override.allowed.filter(a => CONFIG.answers.includes(a)) : [];
    const forbidden = Array.isArray(override?.forbidden) ? override.forbidden.filter(a => CONFIG.answers.includes(a) && !allowed.includes(a)) : [];
    const bestAnswer = CONFIG.answers.includes(override?.bestAnswer) ? override.bestAnswer : null;
    return { allowed, forbidden, bestAnswer };
  }

  function evaluateDefault(s){
    const allowed = [];
    const forbidden = [];
    function allow(a, reason){ allowed.push({answer:a, reason}); }
    function forbid(a, reason){ forbidden.push({answer:a, reason}); }

    if (s.situation === "MANCORRENTE"){
      CONFIG.answers.forEach(a => {
        if (a === "MINI_BILANCINO_MC") allow(a, "Pertinente a mancorrente.");
        else forbid(a, "Non pertinente a mancorrente.");
      });
      return { bestAnswer: "MINI_BILANCINO_MC", allowed, forbidden };
    }

    // Nessuna manovra solo se NON ho corda annessa E il kit-bull non è sufficiente
    if (!s.cordaAnnessa && s.cordaMagazzino !== "SUFFICIENTE"){
      CONFIG.answers.forEach(a => {
        if (a === "NESSUNA_MANOVRA") allow(a, "Non sono disponibili né corda annessa né kit-bull sufficiente.");
        else forbid(a, "Esclusa perché manca sia la corda annessa sia un kit-bull sufficiente.");
      });
      return { bestAnswer: "NESSUNA_MANOVRA", allowed, forbidden };
    }

    const isSingle = isSingleSituation(s);
    const critical = s.calata === "CASCATA" || s.base === "POZZA_TURBOLENTA" || s.sfregamenti || s.vittima === "INCOSCIENTE" || s.vittima === "NON_COLLABORATIVA" || s.cadutaMassi;
    const clean = isSingle && s.calata === "ASCIUTTA" && s.base === "ASCIUTTA" && !s.sfregamenti && s.vittima === "COSCIENTE" && !s.cadutaMassi;

    function consider(answer, ok, okReason, noReason){
      if (ok) allow(answer, okReason);
      else forbid(answer, noReason);
    }

    consider("DIRETTO_SINGOLA",
      isSingle && s.calata !== "CASCATA" && !s.cadutaMassi,
      "Possibile su singola senza cascata e senza caduta massi.",
      !isSingle ? "Non pertinente a questo tipo di situazione." : (s.calata === "CASCATA" ? "Esclusa: calata in cascata." : (s.cadutaMassi ? "Esclusa: caduta massi." : "Esclusa."))
    );

    consider("DIRETTO_DOPPIA",
      s.situation === "CORDA_DOPPIA" && s.calata !== "CASCATA" && !s.cadutaMassi,
      "Possibile su doppia senza cascata e senza caduta massi.",
      s.situation !== "CORDA_DOPPIA" ? "Non pertinente a questo tipo di situazione." : (s.calata === "CASCATA" ? "Esclusa: calata in cascata." : (s.cadutaMassi ? "Esclusa: caduta massi." : "Esclusa."))
    );

    consider("INDIRETTO_SINGOLA",
      isSingle && s.cordaAnnessa,
      "Possibile su singola con corda annessa.",
      !isSingle ? "Non pertinente a questo tipo di situazione." : "Esclusa: manca corda annessa."
    );

    consider("INDIRETTO_DOPPIA",
      s.situation === "CORDA_DOPPIA" && s.cordaAnnessa,
      "Possibile su doppia con corda annessa.",
      s.situation !== "CORDA_DOPPIA" ? "Non pertinente a questo tipo di situazione." : "Esclusa: manca corda annessa."
    );

    consider("PASSAGGIO_NODO",
      isSingle && s.vittima !== "INCOSCIENTE",
      "Possibile su singola se la vittima non è incosciente.",
      !isSingle ? "Non pertinente a questo tipo di situazione." : "Esclusa: vittima incosciente."
    );

    // Svincolo sosta dipende solo da: singola svincolabile, vittima cosciente, kit-bull sufficiente
    consider("SVINCOLO_SOSTA",
      s.situation === "CORDA_SINGOLA_SVINCOLABILE" && s.vittima === "COSCIENTE" && s.cordaMagazzino === "SUFFICIENTE",
      "Possibile su singola svincolabile con vittima cosciente e kit-bull sufficiente.",
      s.situation !== "CORDA_SINGOLA_SVINCOLABILE"
        ? "Esclusa: non è una singola svincolabile."
        : (s.vittima !== "COSCIENTE" ? "Esclusa: la vittima non è cosciente." : "Esclusa: kit-bull non sufficiente.")
    );

    forbid("MINI_BILANCINO_MC", "Non pertinente fuori dal mancorrente.");
    forbid("NESSUNA_MANOVRA", "Esclusa: sono disponibili condizioni minime per almeno una manovra.");

    let bestAnswer = allowed[0]?.answer || "NESSUNA_MANOVRA";
    const allowedCodes = allowed.map(x => x.answer);

    if (isSingle){
      if (allowedCodes.includes("SVINCOLO_SOSTA")) bestAnswer = "SVINCOLO_SOSTA";
      else if (allowedCodes.includes("INDIRETTO_SINGOLA") && critical) bestAnswer = "INDIRETTO_SINGOLA";
      else if (allowedCodes.includes("PASSAGGIO_NODO") && clean) bestAnswer = "PASSAGGIO_NODO";
      else if (allowedCodes.includes("DIRETTO_SINGOLA")) bestAnswer = "DIRETTO_SINGOLA";
      else if (allowedCodes.includes("INDIRETTO_SINGOLA")) bestAnswer = "INDIRETTO_SINGOLA";
      else if (allowedCodes.includes("PASSAGGIO_NODO")) bestAnswer = "PASSAGGIO_NODO";
      else if (allowedCodes.includes("NESSUNA_MANOVRA")) bestAnswer = "NESSUNA_MANOVRA";
    } else if (s.situation === "CORDA_DOPPIA"){
      if (allowedCodes.includes("INDIRETTO_DOPPIA") && critical) bestAnswer = "INDIRETTO_DOPPIA";
      else if (allowedCodes.includes("DIRETTO_DOPPIA")) bestAnswer = "DIRETTO_DOPPIA";
      else if (allowedCodes.includes("INDIRETTO_DOPPIA")) bestAnswer = "INDIRETTO_DOPPIA";
      else if (allowedCodes.includes("NESSUNA_MANOVRA")) bestAnswer = "NESSUNA_MANOVRA";
    }

    return { bestAnswer, allowed, forbidden };
  }

  function evaluateAll(s){
    const signature = scenarioSignature(s);
    const override = getScenarioOverride(signature);
    const base = evaluateDefault(s);

    if (!override) return base;

    const norm = normalizeOverrideLists(override);
    const allowedCodes = norm.allowed.length ? norm.allowed : base.allowed.map(x => x.answer);
    const forbiddenCodes = norm.forbidden.length ? norm.forbidden : base.forbidden.map(x => x.answer);
    const bestAnswer = norm.bestAnswer || base.bestAnswer;

    const allowed = allowedCodes.map(code => ({
      answer: code,
      reason: (override.reasons && override.reasons[code]) || (base.allowed.find(x => x.answer === code)?.reason) || explain(code)
    }));
    const forbidden = forbiddenCodes
      .filter(code => !allowedCodes.includes(code))
      .map(code => ({
        answer: code,
        reason: (override.reasons && override.reasons[code]) || (base.forbidden.find(x => x.answer === code)?.reason) || "Esclusa per override scenario."
      }));

    return { bestAnswer, allowed, forbidden, overrideApplied: true };
  }

  function decideManeuver(s){
    const details = evaluateAll(s);
    return { answer: details.bestAnswer, reason: explain(details.bestAnswer) };
  }

  window.RULES = {
    decideManeuver, getDifficulty, evaluateAll, explain,
    getAllDetailTexts, setDetailText, clearDetailOverrides,
    scenarioSignature, getScenarioOverride, setScenarioOverride, deleteScenarioOverride
  };
})();