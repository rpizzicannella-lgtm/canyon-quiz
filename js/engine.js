(function(){
  let configCache = null;
  let scenariosCache = [];
  let audienceMode = 'ACCOMPAGNATORE';
  let archiveMeta = { version: 'v1', generatedAt: null };

  function setConfig(config){ configCache = config; }
  function getConfig(){ return configCache; }
  function setAudienceMode(mode){ audienceMode = mode || 'ACCOMPAGNATORE'; }
  function getAudienceMode(){ return audienceMode; }

  function maneuverAllowedForAudience(m){
    const t = (m && m.targetAudience) || 'ENTRAMBI';
    if(t === 'ENTRAMBI') return true;
    return t === audienceMode;
  }

  function labelForSituation(id){ return getConfig().situations.find(x => x.id === id)?.label || id; }
  function labelForVariableValue(varId, valueId){
    const variable = getConfig().variables.find(v => v.id === varId);
    return variable?.values.find(v => v.id === valueId)?.label || valueId;
  }
  function labelForManeuver(id){ return getConfig().maneuvers.find(x => x.id === id)?.label || id; }
  function labelForAudience(a){
    if(a === 'ACCOMPAGNATORE') return 'Accompagnatore';
    if(a === 'GUIDA') return 'Guida';
    return 'Entrambi';
  }
  function labelForRiskLevel(r){
    if(r === 'BASSO') return 'Basso';
    if(r === 'MEDIO') return 'Medio';
    if(r === 'ALTO') return 'Alto';
    return r || '';
  }
  function labelForUrgencyLevel(u){
    if(u === 'BASSA') return 'Bassa';
    if(u === 'MEDIA') return 'Media';
    if(u === 'ALTA') return 'Alta';
    return u || '';
  }

  function deriveRiskLevel(s){
    const cfg = getConfig();
    const rules = cfg.riskRules || [];
    function matchCondition(c){
      const val = s[c.field];
      if(c.op === "eq") return val === c.value;
      if(c.op === "neq") return val !== c.value;
      if(c.op === "in") return Array.isArray(c.value) && c.value.includes(val);
      if(c.op === "not_in") return Array.isArray(c.value) && !c.value.includes(val);
      return false;
    }
    for(const r of rules){
      const checks = (r.conditions || []).map(c => ({
        field: c.field,
        op: c.op,
        expected: c.value,
        actual: s[c.field],
        matched: matchCondition(c)
      }));
      if(checks.every(x => x.matched)){
        return { level: r.level, matchedRule: r, checks };
      }
    }
    return { level: 'MEDIO', matchedRule: null, checks: [] };
  }

  function deriveDecisionContext(s){
    const riskInfo = deriveRiskLevel(s);
    const ropeAvailable = s.corda_annessa === 'SI' || s.kitbull === 'SUFFICIENTE';
    const urgency = (
      s.vittima === 'INCOSCIENTE' ||
      s.base === 'POZZA_TURBOLENTA' ||
      s.calata === 'CASCATA' ||
      riskInfo.level === 'ALTO'
    ) ? 'ALTA' : (riskInfo.level === 'BASSO' && s.vittima === 'COSCIENTE' ? 'BASSA' : 'MEDIA');
    const preserveEquipment = (
      riskInfo.level === 'BASSO' &&
      s.calata === 'ASCIUTTA' &&
      s.base === 'ASCIUTTA' &&
      s.vittima === 'COSCIENTE'
    );
    return {
      risk: riskInfo,
      urgency,
      ropeAvailable,
      preserveEquipment,
      notes: [
        'Rischio: ' + labelForRiskLevel(riskInfo.level),
        'Urgenza: ' + labelForUrgencyLevel(urgency),
        'Corda utile disponibile: ' + (ropeAvailable ? 'Sì' : 'No'),
        'Preservazione attrezzatura preferibile: ' + (preserveEquipment ? 'Sì' : 'No')
      ]
    };
  }

  function scenarioSignature(s){
    const ordered = getConfig().variables.map(v => s[v.id] || "");
    return [s.situation, ...ordered].join("|");
  }

  function evalCondition(s, c){
    const current = c.field === "situation" ? s.situation : (c.field === "risk_level" ? deriveRiskLevel(s).level : (c.field === "urgency_level" ? deriveDecisionContext(s).urgency : s[c.field]));
    if(c.op === "eq") return current === c.value;
    if(c.op === "neq") return current !== c.value;
    if(c.op === "in") return Array.isArray(c.value) && c.value.includes(current);
    if(c.op === "not_in") return Array.isArray(c.value) && !c.value.includes(current);
    return false;
  }

  function matchesRule(s, rule){
    return (rule.conditions || []).every(c => evalCondition(s, c));
  }

  function buildAllPossibleScenarioCombos(){
    const cfg = getConfig();
    const valueLists = cfg.variables.map(v => v.values.map(x => x.id));
    const scenarios = [];
    function rec(level, current){
      if(level === cfg.variables.length){
        cfg.situations.forEach(sit => scenarios.push({ situation: sit.id, ...current }));
        return;
      }
      const variable = cfg.variables[level];
      for(const value of valueLists[level]) rec(level + 1, { ...current, [variable.id]: value });
    }
    rec(0, {});
    return scenarios;
  }

  function loadScenarioArchiveFromStorage(){
    const stored = CONFIG_STORE.loadScenarioArchive();
    if(stored && Array.isArray(stored.scenarios) && stored.scenarios.length){
      archiveMeta = stored.meta || { version: 'v1', generatedAt: null };
      scenariosCache = stored.scenarios;
      return scenariosCache;
    }
    return null;
  }
  function saveScenarioArchiveToStorage(){
    CONFIG_STORE.saveScenarioArchive({ meta: archiveMeta, scenarios: scenariosCache });
  }
  function initializeScenarioArchive(){
    const existing = loadScenarioArchiveFromStorage();
    if(existing && existing.length) return existing;
    return regenerateAllScenarios();
  }
  function regenerateAllScenarios(){
    const combos = buildAllPossibleScenarioCombos();
    const now = new Date().toISOString();
    scenariosCache = combos.map((s, idx) => ({ id: idx + 1, version: 'v1', generatedAt: now, ...s }));
    archiveMeta = { version: 'v1', generatedAt: now };
    saveScenarioArchiveToStorage();
    return scenariosCache;
  }
  function addMissingScenarios(){
    const combos = buildAllPossibleScenarioCombos();
    const existingMap = new Map();
    scenariosCache.forEach(s => existingMap.set(scenarioSignature(s), s));
    let nextId = scenariosCache.reduce((max, s) => Math.max(max, Number(s.id) || 0), 0) + 1;
    let added = 0;
    const now = new Date().toISOString();
    combos.forEach(c => {
      const sig = scenarioSignature(c);
      if(!existingMap.has(sig)){
        const sc = { id: nextId++, version: 'v1', generatedAt: now, ...c };
        scenariosCache.push(sc);
        existingMap.set(sig, sc);
        added++;
      }
    });
    if(added > 0) saveScenarioArchiveToStorage();
    return added;
  }

  function getScenarios(){
    if(!scenariosCache.length) initializeScenarioArchive();
    return scenariosCache;
  }
  function getScenarioCount(){ return getScenarios().length; }
  function getScenarioByIndex(index){ return getScenarios()[index] || null; }

  function scenarioText(s){
    const cfg = getConfig();
    const ctx = deriveDecisionContext(s);
    const parts = [];
    parts.push("ID: " + s.id);
    parts.push("Situazione: " + labelForSituation(s.situation));
    parts.push("Livello rischio: " + labelForRiskLevel(ctx.risk.level));
    parts.push("Urgenza: " + labelForUrgencyLevel(ctx.urgency));
    (cfg.variables || []).forEach(v => {
      const val = s[v.id];
      if(val) parts.push(v.label + ": " + labelForVariableValue(v.id, val));
    });
    return parts.join("\n");
  }

  

  function scenarioTextQuiz(s){
    const cfg = getConfig();
    const display = cfg.quizDisplay || {};
    const fallbackFields = ["calata","corda_annessa","kitbull","base","sfregamenti","vittima","compagni_base","caduta_massi"];
    const visibleFields = Array.isArray(display.visibleFields) && display.visibleFields.length ? display.visibleFields : fallbackFields;
    const varById = new Map((cfg.variables || []).map(v => [v.id, v]));
    const parts = [];
    if(display.showScenarioId !== false) parts.push("ID: " + s.id);
    if(display.showSituation !== false) parts.push("Situazione: " + labelForSituation(s.situation));
    visibleFields.forEach(id => {
      const v = varById.get(id);
      if(!v) return;
      const val = s[id];
      if(val !== undefined && val !== null && val !== "") {
        parts.push(v.label + ": " + labelForVariableValue(id, val));
      }
    });
    return parts.join("\n");
  }

  function getDefaultDetailTexts(){
    const out = {};
    (getConfig().maneuvers || []).forEach(m => {
      out[m.id] = getConfig().detailOverrides?.[m.id] || `${m.label}: dettaglio configurabile da admin.`;
    });
    return out;
  }

  function chooseBestByDecisionContext(allowedList, maneuvers, ctx){
    let scored = maneuvers.filter(m => allowedList.includes(m.id)).map(m => {
      let score = -(m.basePriority || 999);
      if(ctx.preserveEquipment && m.id === 'PASSAGGIO_NODO') score += 100;
      if(ctx.urgency === 'ALTA' && (m.id === 'INDIRETTO_SINGOLA' || m.id === 'INDIRETTO_DOPPIA')) score += 90;
      if(ctx.urgency === 'ALTA' && (m.id === 'DIRETTO_SINGOLA' || m.id === 'DIRETTO_DOPPIA')) score += 50;
      if(ctx.risk.level === 'ALTO' && m.id === 'PASSAGGIO_NODO') score -= 40;
      if(ctx.preserveEquipment && (m.id === 'INDIRETTO_SINGOLA' || m.id === 'INDIRETTO_DOPPIA' || m.id === 'DIRETTO_SINGOLA' || m.id === 'DIRETTO_DOPPIA')) score -= 20;
      if(m.id === 'NESSUNA_MANOVRA') score -= 999;
      return { id: m.id, score };
    }).sort((a,b) => b.score - a.score);
    return scored[0] ? scored[0].id : allowedList[0];
  }

  function evaluateScenario(s){
    const cfg = getConfig();
    const ctx = deriveDecisionContext(s);
    const maneuvers = cfg.maneuvers || [];
    const specialNone = maneuvers.find(m => m.specialNone)?.id || "NESSUNA_MANOVRA";
    const debugMap = {};

    function ensureDebug(id){
      if(!debugMap[id]){
        const m = maneuvers.find(x => x.id === id) || { id:id, label:id, targetAudience:'ENTRAMBI' };
        debugMap[id] = {
          answer: id,
          label: m.label,
          targetAudience: m.targetAudience || 'ENTRAMBI',
          profiloDisponibile: maneuverAllowedForAudience(m),
          consentitaDa: [],
          esclusaDa: [],
          override: [],
          statoFinale: '',
          sceltaFinale: false,
          motivoScelta: ''
        };
      }
      return debugMap[id];
    }
    maneuvers.forEach(m => ensureDebug(m.id));

    const allowed = new Set();
    const allowedReason = {};
    const forbiddenReason = {};
    const excluded = new Set();

    (cfg.rules || []).filter(r => r.enabled && r.type === "allow" && matchesRule(s, r)).forEach(rule => {
      (rule.maneuvers || []).forEach(m => {
        allowed.add(m);
        allowedReason[m] = rule.note || "Consentita da regola.";
        ensureDebug(m).consentitaDa.push({ ruleId: rule.id, ruleName: rule.name, note: rule.note || "Consentita da regola." });
      });
    });

    (cfg.rules || []).filter(r => r.enabled && r.type === "exclude" && matchesRule(s, r)).forEach(rule => {
      (rule.maneuvers || []).forEach(m => {
        excluded.add(m);
        allowed.delete(m);
        forbiddenReason[m] = rule.note || "Esclusa da regola.";
        ensureDebug(m).esclusaDa.push({ ruleId: rule.id, ruleName: rule.name, note: rule.note || "Esclusa da regola." });
      });
    });

    const signature = scenarioSignature(s);
    const override = cfg.scenarioOverrides?.[signature];
    if(override){
      if(Array.isArray(override.allowed)){
        allowed.clear();
        override.allowed.forEach(m => {
          allowed.add(m);
          ensureDebug(m).override.push({ type:'allowed', note:'Consentita da override scenario.' });
        });
      }
      if(Array.isArray(override.forbidden)){
        override.forbidden.forEach(m => {
          excluded.add(m);
          ensureDebug(m).override.push({ type:'forbidden', note:'Esclusa da override scenario.' });
        });
      }
      if(override.reasons){
        Object.keys(override.reasons).forEach(k => {
          if(allowed.has(k)) allowedReason[k] = override.reasons[k];
          else forbiddenReason[k] = override.reasons[k];
          ensureDebug(k).override.push({ type:'reason', note:override.reasons[k] });
        });
      }
    }

    const audienceManeuvers = maneuvers.filter(m => maneuverAllowedForAudience(m));
    const allManeuvers = audienceManeuvers.map(m => m.id).filter(id => id !== specialNone);
    let allowedList = allManeuvers.filter(id => allowed.has(id));
    let forbiddenList = allManeuvers.filter(id => !allowed.has(id));

    if(!allowedList.length){
      const specialM = maneuvers.find(m => m.id === specialNone);
      if(maneuverAllowedForAudience(specialM)) {
        allowedList = [specialNone];
        ensureDebug(specialNone).consentitaDa.push({ ruleId:'AUTO_NONE', ruleName:'Fallback nessuna manovra', note:'Nessuna manovra disponibile dopo l’applicazione delle regole.' });
      }
      forbiddenList = allManeuvers;
      allowedReason[specialNone] = "Nessuna manovra disponibile dopo l'applicazione delle regole.";
    }

    let best = allowedList[0];
    const priorityRules = (cfg.rules || []).filter(r => r.enabled && r.type === "priority" && matchesRule(s, r));
    let bestReason = '';

    if(override?.bestAnswer && allowedList.includes(override.bestAnswer)){
      best = override.bestAnswer;
      bestReason = 'Risposta migliore impostata da override scenario.';
      ensureDebug(best).override.push({ type:'bestAnswer', note:bestReason });
    } else if(priorityRules.length){
      for(const rule of priorityRules){
        const found = (rule.priority || []).find(m => allowedList.includes(m));
        if(found){
          best = found;
          bestReason = 'Scelta dalla regola di priorità: ' + rule.name;
          ensureDebug(best).motivoScelta = bestReason;
          break;
        }
      }
    } else {
      best = chooseBestByDecisionContext(allowedList, maneuvers, ctx);
      bestReason = 'Scelta dal contesto decisionale ottimizzato.';
    }

    Object.keys(debugMap).forEach(id => {
      const d = debugMap[id];
      if(!d.profiloDisponibile) d.statoFinale = 'Non disponibile per profilo';
      else if(allowedList.includes(id)) d.statoFinale = 'Consentita';
      else if(forbiddenList.includes(id)) d.statoFinale = 'Esclusa';
      else d.statoFinale = 'Non applicabile';
      if(id === best){
        d.sceltaFinale = true;
        d.motivoScelta = bestReason || allowedReason[id] || 'Selezionata dal motore.';
      }
    });

    const debug = maneuvers.filter(m => maneuverAllowedForAudience(m) || m.id === specialNone).map(m => debugMap[m.id]);

    return {
      riskLevel: ctx.risk.level,
      riskDebug: ctx.risk,
      urgencyLevel: ctx.urgency,
      decisionContext: ctx,
      bestAnswer: best,
      allowed: allowedList.map(id => ({ answer:id, reason: allowedReason[id] || cfg.detailOverrides?.[id] || "Consentita." })),
      forbidden: forbiddenList.map(id => ({ answer:id, reason: forbiddenReason[id] || "Non ammessa dalle regole correnti." })),
      reason: cfg.detailOverrides?.[best] || bestReason || allowedReason[best] || "Risposta selezionata dal motore.",
      debug
    };
  }

  function recalcScenario(s){
    const e = evaluateScenario(s);
    return { ...s, correctAnswer: e.bestAnswer, reason: e.reason };
  }


  function evaluateAuditCondition(s, c, details){
    const current = c.field === "situation" ? s.situation : (c.field === "risk_level" ? details.riskLevel : (c.field === "urgency_level" ? details.urgencyLevel : s[c.field]));
    if(c.op === "eq") return current === c.value;
    if(c.op === "neq") return current !== c.value;
    if(c.op === "in") return Array.isArray(c.value) && c.value.includes(current);
    if(c.op === "not_in") return Array.isArray(c.value) && !c.value.includes(current);
    return false;
  }

  function evaluateAuditCheck(ruleCheck, rs, details){
    const allowedIds = details.allowed.map(x => x.answer);
    const forbiddenIds = details.forbidden.map(x => x.answer);
    switch(ruleCheck.kind){
      case "allowed_contains": return allowedIds.includes(ruleCheck.value);
      case "allowed_not_contains": return !allowedIds.includes(ruleCheck.value);
      case "forbidden_contains": return forbiddenIds.includes(ruleCheck.value);
      case "best_answer_is": return rs.correctAnswer === ruleCheck.value;
      case "best_answer_not": return rs.correctAnswer !== ruleCheck.value;
      case "best_answer_in": return Array.isArray(ruleCheck.value) && ruleCheck.value.includes(rs.correctAnswer);
      case "allowed_any_of": return Array.isArray(ruleCheck.value) && ruleCheck.value.some(v => allowedIds.includes(v));
      case "allowed_any_except": return allowedIds.some(v => v !== ruleCheck.value);
      default: return false;
    }
  }

  function evaluateAuditRule(rule, rs, details){
    const condsOk = (rule.conditions || []).every(c => evaluateAuditCondition(rs, c, details));
    const checksOk = (rule.checks || []).every(ch => evaluateAuditCheck(ch, rs, details));
    return condsOk && checksOk;
  }

  function auditScenarios(){
    const scenarios = getScenarios();
    const findings = [];
    const auditRules = getConfig().auditRules || [];
    scenarios.forEach(s => {
      const rs = recalcScenario(s);
      const details = evaluateScenario(rs);
      auditRules.filter(r => r.enabled).forEach(rule => {
        if(evaluateAuditRule(rule, rs, details)){
          findings.push({
            scenarioId: rs.id,
            signature: scenarioSignature(rs),
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity || 'MEDIA',
            bestAnswer: rs.correctAnswer,
            bestAnswerLabel: labelForManeuver(rs.correctAnswer),
            riskLevel: details.riskLevel,
            urgencyLevel: details.urgencyLevel,
            scenarioText: scenarioText(rs),
            problems: [rule.problem || 'Possibile incoerenza rilevata.'],
            suggestions: [rule.suggestion || 'Verificare regole e priorità.']
          });
        }
      });
    });
    return findings;
  }

  window.ENGINE = {
    setConfig, getConfig, setAudienceMode, getAudienceMode,
    labelForSituation, labelForVariableValue, labelForManeuver, labelForAudience, labelForRiskLevel, labelForUrgencyLevel, deriveRiskLevel, deriveDecisionContext,
    scenarioSignature, buildAllPossibleScenarioCombos, initializeScenarioArchive,
    regenerateAllScenarios, addMissingScenarios, getScenarioCount, getScenarios, getScenarioByIndex,
    scenarioText, scenarioTextQuiz, evaluateScenario, recalcScenario, getDefaultDetailTexts, auditScenarios
  };
})();