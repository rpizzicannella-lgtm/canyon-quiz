(function(){
  const STORAGE_KEY = "canyon_manual_scenarios_v11";
  function generateAllScenarios(){
    const scenarios = [];
    let id = 1;
    for (const situation of CONFIG.situations){
      for (const calata of CONFIG.calataTypes){
        for (const base of CONFIG.baseTypes){
          for (const sfregamenti of [false, true]){
            for (const cordaAnnessa of [false, true]){
              for (const vittima of CONFIG.victimStates){
                for (const compagniBase of [false, true]){
                  for (const cadutaMassi of [false, true]){
                    for (const cordaMagazzino of CONFIG.cordaMagazzinoStates){
                      const scenario = { id:id++, situation, calata, base, sfregamenti, cordaAnnessa, vittima, compagniBase, cadutaMassi, cordaMagazzino };
                      const result = RULES.decideManeuver(scenario);
                      scenarios.push({ ...scenario, correctAnswer: result.answer, reason: result.reason, difficulty: RULES.getDifficulty(scenario) });
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
    return scenarios;
  }
  async function loadOfficialScenarios(){
    try {
      const res = await fetch("./data/manual-scenarios.json");
      if (!res.ok) throw new Error("fetch failed");
      return await res.json();
    } catch(e) {
      return generateAllScenarios();
    }
  }
  function loadLocalOverrides(){ try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch(e) { return null; } }
  function saveLocalOverrides(list){ localStorage.setItem(STORAGE_KEY, JSON.stringify(list)); }
  function clearLocalOverrides(){ localStorage.removeItem(STORAGE_KEY); }
  function recalcScenario(s){ const result = RULES.decideManeuver(s); return { ...s, correctAnswer: result.answer, reason: result.reason, difficulty: RULES.getDifficulty(s) }; }
  function getRandomScenario(){ const pool = window.ALL_SCENARIOS || []; if (!pool.length) return null; return pool[Math.floor(Math.random() * pool.length)]; }
  async function initScenarioStore(){ const local = loadLocalOverrides(); window.ALL_SCENARIOS = local || await loadOfficialScenarios(); return window.ALL_SCENARIOS; }
  function replaceAllScenarios(list){ window.ALL_SCENARIOS = list.map(recalcScenario); saveLocalOverrides(window.ALL_SCENARIOS); }
  window.SCENARIOS = { initScenarioStore, getRandomScenario, generateAllScenarios, recalcScenario, replaceAllScenarios, saveLocalOverrides, clearLocalOverrides, STORAGE_KEY };
})();