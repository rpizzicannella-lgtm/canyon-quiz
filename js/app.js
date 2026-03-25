
(function () {
  const state = {
    allScenarios: [],
    currentScenario: null,
    score: 0,
    questionIndex: 0,
    remaining: 0,
    timerId: null,
    quizPool: [],
    mode: CONFIG.defaultSettings.mode,
    difficulty: CONFIG.defaultSettings.difficulty,
    timerSeconds: CONFIG.defaultSettings.timerSeconds,
    examCount: CONFIG.defaultSettings.examCount,
    answersLocked: true,
    deferredPrompt: null,
    editorSelectedId: null
  };

  const el = {};
  const ANSWER_OPTIONS = [{ value: "", label: "Tutte" }].concat(CONFIG.answers.map(a => ({ value: a, label: LABELS.answers[a] })));

  function qs(id) { return document.getElementById(id); }

  function initRefs() {
    [
      "modeSelect","difficultySelect","timerSelect","examCountSelect","startBtn","newScenarioBtn","openAdminBtn",
      "scoreValue","questionValue","remainingValue","errorsValue","timerValue","messageBox","scenarioMeta","scenarioDetails",
      "answersContainer","resultBox","adminSection","scenarioSearch","adminDifficultyFilter","adminAnswerFilter","scenarioList",
      "adminCount","editId","editSituation","editCalata","editBase","editSfregamenti","editCordaAnnessa","editVittima",
      "editCompagniBase","editCadutaMassi","editCorrectAnswer","editDifficulty","editReason","editorInfo","addScenarioBtn",
      "saveScenarioBtn","deleteScenarioBtn","resetOfficialBtn","recalcScenarioBtn","duplicateScenarioBtn","exportJsonBtn",
      "importJsonInput","installBtn","refreshBtn"
    ].forEach(id => el[id] = qs(id));
  }

  function populateSelect(select, items, mapLabels) {
    select.innerHTML = "";
    items.forEach(value => {
      const option = document.createElement("option");
      option.value = value;
      option.textContent = mapLabels ? mapLabels[value] : value;
      select.appendChild(option);
    });
  }

  function loadSettings() {
    const raw = localStorage.getItem(CONFIG.settingsKey);
    const saved = raw ? JSON.parse(raw) : CONFIG.defaultSettings;
    state.mode = saved.mode || CONFIG.defaultSettings.mode;
    state.difficulty = saved.difficulty ?? CONFIG.defaultSettings.difficulty;
    state.timerSeconds = Number(saved.timerSeconds || CONFIG.defaultSettings.timerSeconds);
    state.examCount = Number(saved.examCount || CONFIG.defaultSettings.examCount);

    el.modeSelect.value = state.mode;
    el.difficultySelect.value = state.difficulty;
    el.timerSelect.value = String(state.timerSeconds);
    el.examCountSelect.value = String(state.examCount);
  }

  function saveSettings() {
    localStorage.setItem(CONFIG.settingsKey, JSON.stringify({
      mode: state.mode,
      difficulty: state.difficulty,
      timerSeconds: state.timerSeconds,
      examCount: state.examCount
    }));
  }

  function loadErrors() {
    const raw = localStorage.getItem(CONFIG.errorKey);
    return raw ? JSON.parse(raw) : [];
  }

  function saveError(entry) {
    const items = loadErrors();
    items.unshift(entry);
    localStorage.setItem(CONFIG.errorKey, JSON.stringify(items.slice(0, 200)));
    updateStats();
  }

  function formatScenarioLines(s) {
    return [
      ["Situazione", LABELS.situation[s.situation]],
      ["Calata", LABELS.calata[s.calata]],
      ["Base", LABELS.base[s.base]],
      ["Sfregamenti", LABELS.boolean[String(s.sfregamenti)]],
      ["Corda annessa", LABELS.boolean[String(s.cordaAnnessa)]],
      ["Vittima", LABELS.vittima[s.vittima]],
      ["Compagni alla base", LABELS.boolean[String(s.compagniBase)]],
      ["Caduta massi", LABELS.boolean[String(s.cadutaMassi)]]
    ];
  }

  function renderScenario(s) {
    el.scenarioMeta.innerHTML = `
      <span class="badge">ID ${s.id}</span>
      <span class="badge">${LABELS.difficulty[s.difficulty]}</span>
      <span class="badge">${LABELS.answers[s.correctAnswer] || "Da definire"}</span>
    `;
    el.scenarioDetails.innerHTML = formatScenarioLines(s).map(([k,v]) =>
      `<div class="scenario-row"><span>${k}</span><strong>${v}</strong></div>`
    ).join("");
  }

  function createAnswerButtons() {
    el.answersContainer.innerHTML = "";
    CONFIG.answers.forEach(code => {
      const btn = document.createElement("button");
      btn.className = "answer-btn";
      btn.textContent = LABELS.answers[code];
      btn.dataset.answer = code;
      btn.disabled = state.answersLocked;
      btn.addEventListener("click", () => handleAnswer(code, btn));
      el.answersContainer.appendChild(btn);
    });
  }

  function clearResult() {
    el.resultBox.classList.add("hidden");
    el.resultBox.innerHTML = "";
  }

  function showMessage(text) {
    el.messageBox.textContent = text;
  }

  function updateStats() {
    el.scoreValue.textContent = state.score;
    el.questionValue.textContent = state.questionIndex;
    el.remainingValue.textContent = state.remaining;
    el.errorsValue.textContent = loadErrors().length;
  }

  function lockAnswers() {
    state.answersLocked = true;
    [...el.answersContainer.querySelectorAll("button")].forEach(b => b.disabled = true);
  }

  function unlockAnswers() {
    state.answersLocked = false;
    [...el.answersContainer.querySelectorAll("button")].forEach(b => b.disabled = false);
  }

  function stopTimer() {
    if (state.timerId) clearInterval(state.timerId);
    state.timerId = null;
  }

  function startTimer() {
    stopTimer();
    let remaining = state.timerSeconds;
    el.timerValue.textContent = remaining;
    state.timerId = setInterval(() => {
      remaining -= 1;
      el.timerValue.textContent = remaining;
      if (remaining <= 0) {
        stopTimer();
        handleTimeout();
      }
    }, 1000);
  }

  function getScenarioPool() {
    let pool = [...state.allScenarios];
    if (state.difficulty) {
      pool = pool.filter(s => s.difficulty === state.difficulty);
    }
    return pool;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function prepareQuiz() {
    const pool = getScenarioPool();
    if (!pool.length) {
      showMessage("Nessuno scenario disponibile con i filtri scelti.");
      return false;
    }
    state.score = 0;
    state.questionIndex = 0;
    state.quizPool = state.mode === "EXAM" ? shuffle(pool).slice(0, Math.min(state.examCount, pool.length)) : shuffle(pool);
    state.remaining = state.quizPool.length;
    updateStats();
    return true;
  }

  function nextScenario(manual = false) {
    clearResult();
    lockAnswers();

    if (!manual && !state.quizPool.length) {
      showFinal();
      return;
    }

    state.currentScenario = manual ? SCENARIOS.getRandomScenario(state.difficulty, getScenarioPool()) : state.quizPool.shift();
    if (!state.currentScenario) {
      showMessage("Nessuno scenario disponibile.");
      return;
    }

    if (!manual) {
      state.questionIndex += 1;
      state.remaining = state.quizPool.length;
    }

    renderScenario(state.currentScenario);
    updateStats();
    createAnswerButtons();
    unlockAnswers();
    showMessage("Seleziona la manovra corretta entro il tempo.");
    startTimer();
  }

  function markButtons(selected, correct) {
    [...el.answersContainer.querySelectorAll("button")].forEach(btn => {
      btn.disabled = true;
      if (btn.dataset.answer === correct) btn.classList.add("correct");
      if (selected && btn.dataset.answer === selected && selected !== correct) btn.classList.add("wrong");
    });
  }

  function showResult(isCorrect, selectedCode, timedOut) {
    const s = state.currentScenario;
    const correct = s.correctAnswer;
    const title = timedOut ? "Tempo scaduto" : (isCorrect ? "Corretto" : "Errato");
    el.resultBox.classList.remove("hidden");
    el.resultBox.innerHTML = `
      <h3>${title}</h3>
      <p><strong>Risposta corretta:</strong> ${LABELS.answers[correct]}</p>
      <p><strong>Motivo:</strong> ${s.reason}</p>
      ${selectedCode ? `<p><strong>Tua risposta:</strong> ${LABELS.answers[selectedCode]}</p>` : ""}
    `;
  }

  function handleAnswer(code, btn) {
    if (state.answersLocked || !state.currentScenario) return;
    stopTimer();
    lockAnswers();
    const correct = state.currentScenario.correctAnswer;
    const isCorrect = code === correct;
    if (isCorrect) {
      state.score += 1;
      showMessage("Risposta corretta.");
    } else {
      showMessage("Risposta errata.");
      saveError({
        at: new Date().toISOString(),
        scenarioId: state.currentScenario.id,
        selected: code,
        correct,
        difficulty: state.currentScenario.difficulty
      });
    }
    markButtons(code, correct);
    showResult(isCorrect, code, false);
    updateStats();
  }

  function handleTimeout() {
    lockAnswers();
    markButtons(null, state.currentScenario.correctAnswer);
    showMessage("Tempo scaduto.");
    saveError({
      at: new Date().toISOString(),
      scenarioId: state.currentScenario.id,
      selected: null,
      correct: state.currentScenario.correctAnswer,
      difficulty: state.currentScenario.difficulty
    });
    showResult(false, null, true);
  }

  function showFinal() {
    stopTimer();
    lockAnswers();
    showMessage(`Quiz completato. Punteggio finale: ${state.score}`);
    el.timerValue.textContent = "--";
    el.resultBox.classList.remove("hidden");
    el.resultBox.innerHTML = `<h3>Esame concluso</h3><p>Hai totalizzato <strong>${state.score}</strong> risposte corrette.</p>`;
  }

  function toggleAdmin() {
    el.adminSection.classList.toggle("hidden");
    renderAdminList();
    if (!el.adminSection.classList.contains("hidden") && state.editorSelectedId === null && state.allScenarios.length) {
      loadScenarioInEditor(state.allScenarios[0].id);
    }
  }

  function adminFilteredScenarios() {
    const search = el.scenarioSearch.value.trim().toLowerCase();
    const difficulty = el.adminDifficultyFilter.value;
    const answer = el.adminAnswerFilter.value;

    return state.allScenarios.filter(s => {
      const hay = [
        String(s.id),
        LABELS.situation[s.situation],
        LABELS.calata[s.calata],
        LABELS.base[s.base],
        LABELS.vittima[s.vittima],
        LABELS.answers[s.correctAnswer] || "",
        s.reason || ""
      ].join(" ").toLowerCase();

      return (!search || hay.includes(search))
        && (!difficulty || s.difficulty === difficulty)
        && (!answer || s.correctAnswer === answer);
    });
  }

  function renderAdminList() {
    const items = adminFilteredScenarios();
    el.adminCount.textContent = `${items.length} scenari`;
    el.scenarioList.innerHTML = items.map(s => `
      <div class="scenario-item ${state.editorSelectedId === s.id ? "active" : ""}" data-id="${s.id}">
        <strong>#${s.id} · ${LABELS.situation[s.situation]}</strong><br />
        <small>${LABELS.answers[s.correctAnswer] || "N/D"} · ${LABELS.difficulty[s.difficulty]}</small>
      </div>
    `).join("");

    [...el.scenarioList.querySelectorAll(".scenario-item")].forEach(item => {
      item.addEventListener("click", () => loadScenarioInEditor(Number(item.dataset.id)));
    });
  }

  function getScenarioById(id) {
    return state.allScenarios.find(s => s.id === id) || null;
  }

  function loadScenarioInEditor(id) {
    const s = getScenarioById(id);
    if (!s) return;
    state.editorSelectedId = id;
    el.editId.value = s.id;
    el.editSituation.value = s.situation;
    el.editCalata.value = s.calata;
    el.editBase.value = s.base;
    el.editSfregamenti.value = String(s.sfregamenti);
    el.editCordaAnnessa.value = String(s.cordaAnnessa);
    el.editVittima.value = s.vittima;
    el.editCompagniBase.value = String(s.compagniBase);
    el.editCadutaMassi.value = String(s.cadutaMassi);
    el.editCorrectAnswer.value = s.correctAnswer || "";
    el.editDifficulty.value = s.difficulty;
    el.editReason.value = s.reason || "";
    el.editorInfo.textContent = "Scenario caricato in editor.";
    renderAdminList();
  }

  function readEditorScenario() {
    return {
      id: Number(el.editId.value) || 0,
      situation: el.editSituation.value,
      calata: el.editCalata.value,
      base: el.editBase.value,
      sfregamenti: el.editSfregamenti.value === "true",
      cordaAnnessa: el.editCordaAnnessa.value === "true",
      vittima: el.editVittima.value,
      compagniBase: el.editCompagniBase.value === "true",
      cadutaMassi: el.editCadutaMassi.value === "true",
      correctAnswer: el.editCorrectAnswer.value || null,
      difficulty: el.editDifficulty.value,
      reason: el.editReason.value.trim()
    };
  }

  function persistScenarios() {
    state.allScenarios = SCENARIOS.renumber(state.allScenarios);
    SCENARIOS.saveLocalScenarios(state.allScenarios);
    renderAdminList();
    updateStats();
  }

  function saveEditorScenario() {
    const item = readEditorScenario();
    const index = state.allScenarios.findIndex(s => s.id === item.id);
    if (index === -1) return;
    state.allScenarios[index] = { ...item };
    persistScenarios();
    state.editorSelectedId = item.id;
    el.editorInfo.textContent = "Scenario salvato in locale. Esporta il JSON per renderlo ufficiale online.";
    renderAdminList();
  }

  function recalcEditorScenario() {
    const item = readEditorScenario();
    const recalculated = SCENARIOS.buildScenario(item.id || 1, item);
    el.editCorrectAnswer.value = recalculated.correctAnswer || "";
    el.editDifficulty.value = recalculated.difficulty;
    el.editReason.value = recalculated.reason;
    el.editorInfo.textContent = "Risposta, motivazione e difficoltà ricalcolate dal motore di regole.";
  }

  function addNewScenario() {
    const maxId = state.allScenarios.length ? Math.max(...state.allScenarios.map(s => s.id)) : 0;
    const fresh = SCENARIOS.buildScenario(maxId + 1, {
      situation: "CORDA_SINGOLA",
      calata: "ASCIUTTA",
      base: "ASCIUTTA",
      sfregamenti: false,
      cordaAnnessa: false,
      vittima: "COSCIENTE",
      compagniBase: false,
      cadutaMassi: false
    });
    state.allScenarios.push(fresh);
    persistScenarios();
    loadScenarioInEditor(fresh.id);
  }

  function duplicateScenario() {
    const current = getScenarioById(state.editorSelectedId);
    if (!current) return;
    const copy = { ...current, id: state.allScenarios.length + 1 };
    state.allScenarios.push(copy);
    persistScenarios();
    loadScenarioInEditor(copy.id);
    el.editorInfo.textContent = "Scenario duplicato.";
  }

  function deleteScenario() {
    if (state.editorSelectedId === null) return;
    state.allScenarios = state.allScenarios.filter(s => s.id !== state.editorSelectedId);
    persistScenarios();
    state.editorSelectedId = null;
    if (state.allScenarios.length) loadScenarioInEditor(state.allScenarios[0].id);
    else addNewScenario();
    el.editorInfo.textContent = "Scenario eliminato.";
  }

  async function resetOfficialScenarios() {
    SCENARIOS.resetLocalScenarios();
    const official = await SCENARIOS.loadOfficialScenarios();
    state.allScenarios = SCENARIOS.normalizeImported(official);
    renderAdminList();
    if (state.allScenarios.length) loadScenarioInEditor(state.allScenarios[0].id);
    el.editorInfo.textContent = "Ripristinati gli scenari ufficiali pubblicati.";
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(state.allScenarios, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "manual-scenarios.json";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  function importJson(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        state.allScenarios = SCENARIOS.renumber(SCENARIOS.normalizeImported(data));
        persistScenarios();
        loadScenarioInEditor(state.allScenarios[0].id);
        el.editorInfo.textContent = "Import completato.";
      } catch (err) {
        el.editorInfo.textContent = "Import non valido.";
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    el.modeSelect.addEventListener("change", e => { state.mode = e.target.value; saveSettings(); });
    el.difficultySelect.addEventListener("change", e => { state.difficulty = e.target.value; saveSettings(); });
    el.timerSelect.addEventListener("change", e => { state.timerSeconds = Number(e.target.value); saveSettings(); });
    el.examCountSelect.addEventListener("change", e => { state.examCount = Number(e.target.value); saveSettings(); });

    el.startBtn.addEventListener("click", () => {
      if (!prepareQuiz()) return;
      nextScenario(false);
    });

    el.newScenarioBtn.addEventListener("click", () => {
      if (!prepareQuiz()) return;
      nextScenario(true);
    });

    el.openAdminBtn.addEventListener("click", toggleAdmin);
    el.addScenarioBtn.addEventListener("click", addNewScenario);
    el.saveScenarioBtn.addEventListener("click", saveEditorScenario);
    el.deleteScenarioBtn.addEventListener("click", deleteScenario);
    el.resetOfficialBtn.addEventListener("click", resetOfficialScenarios);
    el.recalcScenarioBtn.addEventListener("click", recalcEditorScenario);
    el.duplicateScenarioBtn.addEventListener("click", duplicateScenario);
    el.exportJsonBtn.addEventListener("click", exportJson);
    el.importJsonInput.addEventListener("change", e => {
      if (e.target.files[0]) importJson(e.target.files[0]);
    });

    ["scenarioSearch","adminDifficultyFilter","adminAnswerFilter"].forEach(id => {
      el[id].addEventListener("input", renderAdminList);
      el[id].addEventListener("change", renderAdminList);
    });

    el.installBtn.addEventListener("click", async () => {
      if (!state.deferredPrompt) return;
      state.deferredPrompt.prompt();
      await state.deferredPrompt.userChoice;
      state.deferredPrompt = null;
      el.installBtn.classList.add("hidden");
    });

    el.refreshBtn.addEventListener("click", () => window.location.reload());

    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      state.deferredPrompt = e;
      el.installBtn.classList.remove("hidden");
    });
  }

  async function boot() {
    initRefs();
    populateSelect(el.adminAnswerFilter, ANSWER_OPTIONS.map(x => x.value), ANSWER_OPTIONS.reduce((acc, x) => (acc[x.value]=x.label, acc), {}));
    populateSelect(el.editSituation, CONFIG.situations, LABELS.situation);
    populateSelect(el.editCalata, CONFIG.calataTypes, LABELS.calata);
    populateSelect(el.editBase, CONFIG.baseTypes, LABELS.base);
    populateSelect(el.editVittima, CONFIG.victimStates, LABELS.vittima);
    populateSelect(el.editCorrectAnswer, CONFIG.answers, LABELS.answers);

    loadSettings();
    bindEvents();

    let scenarios = SCENARIOS.loadLocalScenarios();
    if (scenarios) {
      state.allScenarios = SCENARIOS.normalizeImported(scenarios);
    } else {
      const official = await SCENARIOS.loadOfficialScenarios();
      state.allScenarios = SCENARIOS.normalizeImported(official);
    }

    createAnswerButtons();
    updateStats();
    renderAdminList();
    if (state.allScenarios.length) loadScenarioInEditor(state.allScenarios[0].id);
    showMessage(`Scenari caricati: ${state.allScenarios.length}.`);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("./sw.js");
    }
  }

  window.addEventListener("load", boot);
})();
