
(function () {
  function buildScenario(id, raw, override = {}) {
    const scenario = {
      id,
      situation: raw.situation,
      calata: raw.calata,
      base: raw.base,
      sfregamenti: !!raw.sfregamenti,
      cordaAnnessa: !!raw.cordaAnnessa,
      vittima: raw.vittima,
      compagniBase: !!raw.compagniBase,
      cadutaMassi: !!raw.cadutaMassi
    };

    const evaluated = RULES.decideManeuver(scenario);
    return {
      ...scenario,
      correctAnswer: override.correctAnswer || evaluated.answer,
      reason: override.reason || evaluated.reason,
      difficulty: override.difficulty || RULES.getDifficulty(scenario)
    };
  }

  function generateAllScenarios() {
    const scenarios = [];
    let id = 1;

    for (const situation of CONFIG.situations) {
      for (const calata of CONFIG.calataTypes) {
        for (const base of CONFIG.baseTypes) {
          for (const sfregamenti of [false, true]) {
            for (const cordaAnnessa of [false, true]) {
              for (const vittima of CONFIG.victimStates) {
                for (const compagniBase of [false, true]) {
                  for (const cadutaMassi of [false, true]) {
                    const raw = { situation, calata, base, sfregamenti, cordaAnnessa, vittima, compagniBase, cadutaMassi };
                    const scenario = buildScenario(id++, raw);
                    if (scenario.correctAnswer !== null) {
                      scenarios.push(scenario);
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

  async function loadOfficialScenarios() {
    const res = await fetch("./data/manual-scenarios.json");
    if (!res.ok) throw new Error("Impossibile caricare data/manual-scenarios.json");
    return await res.json();
  }

  function saveLocalScenarios(items) {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(items));
  }

  function loadLocalScenarios() {
    const raw = localStorage.getItem(CONFIG.storageKey);
    return raw ? JSON.parse(raw) : null;
  }

  function resetLocalScenarios() {
    localStorage.removeItem(CONFIG.storageKey);
  }

  function normalizeImported(items) {
    return items.map((item, index) =>
      buildScenario(item.id || index + 1, item, {
        correctAnswer: item.correctAnswer,
        reason: item.reason,
        difficulty: item.difficulty
      })
    );
  }

  function renumber(items) {
    return items.map((item, index) => ({ ...item, id: index + 1 }));
  }

  function getRandomScenario(level, source) {
    let pool = source || window.ALL_SCENARIOS || [];
    if (level) pool = pool.filter(s => s.difficulty === level);
    if (!pool.length) return null;
    return pool[Math.floor(Math.random() * pool.length)];
  }

  window.SCENARIOS = {
    buildScenario,
    generateAllScenarios,
    loadOfficialScenarios,
    saveLocalScenarios,
    loadLocalScenarios,
    resetLocalScenarios,
    normalizeImported,
    renumber,
    getRandomScenario
  };
})();
