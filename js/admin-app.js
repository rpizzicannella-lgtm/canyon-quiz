(function(){
  const el = {};
  const $ = id => document.getElementById(id);
  const PIN_OK_KEY = "canyon_admin_pin_ok_v13";

  function showAdmin(){ $("pinGate").classList.add("hidden"); $("adminApp").classList.remove("hidden"); }
  function checkPin(){
    const pin = $("pinInput").value.trim();
    if (pin === CONFIG.adminPin){
      localStorage.setItem(PIN_OK_KEY, "1");
      showAdmin();
      initProtected();
    } else {
      $("pinMsg").textContent = "PIN non corretto.";
    }
  }

  function populateSelect(select, values, map){
    select.innerHTML = "";
    values.forEach(v => {
      const o = document.createElement("option");
      o.value = v; o.textContent = map ? map[v] : v; select.appendChild(o);
    });
  }

  function scenarioText(s){
    return `Situazione: ${LABELS.situation[s.situation]}
Calata: ${LABELS.calata[s.calata]}
Base: ${LABELS.base[s.base]}
Sfregamenti: ${s.sfregamenti ? "Sì" : "No"}
Corda annessa: ${s.cordaAnnessa ? "Sì" : "No"}
Vittima: ${LABELS.vittima[s.vittima]}
Compagni alla base: ${s.compagniBase ? "Sì" : "No"}
Caduta massi: ${s.cadutaMassi ? "Sì" : "No"}
Kit-bull in sosta: ${LABELS.cordaMagazzino[s.cordaMagazzino]}
Risposta attuale: ${LABELS.answers[s.correctAnswer]}`;
  }

  function buildDetailEditors(){
    const texts = RULES.getAllDetailTexts();
    el.responseDetailEditor.innerHTML = "";
    CONFIG.answers.forEach(answer => {
      const wrap = document.createElement("div");
      wrap.className = "item";
      wrap.innerHTML = `<strong>${LABELS.answers[answer]}</strong><div class="muted">${answer}</div><textarea id="detail_${answer}"></textarea><button type="button" data-answer="${answer}" class="saveDetailBtn">Salva testo risposta</button>`;
      el.responseDetailEditor.appendChild(wrap);
      wrap.querySelector("textarea").value = texts[answer] || "";
    });
    [...document.querySelectorAll(".saveDetailBtn")].forEach(btn => {
      btn.addEventListener("click", () => {
        const answer = btn.dataset.answer;
        RULES.setDetailText(answer, $("detail_" + answer).value);
        el.result.textContent = "Dettaglio risposta aggiornato localmente.";
        const idx = Number(el.scenarioSelect.value || 0);
        if (window.ALL_SCENARIOS[idx]) renderPreview(window.ALL_SCENARIOS[idx]);
      });
    });
  }

  function buildOverrideEditor(s){
    const sig = RULES.scenarioSignature(s);
    const override = RULES.getScenarioOverride(sig) || {};
    const details = RULES.evaluateAll(s);
    const baseAllowed = details.allowed.map(x => x.answer);
    const baseForbidden = details.forbidden.map(x => x.answer);

    el.scenarioRuleEditor.innerHTML = "";
    CONFIG.answers.forEach(answer => {
      const block = document.createElement("div");
      block.className = "item";
      const isAllowed = (override.allowed || baseAllowed).includes(answer);
      const isForbidden = (override.forbidden || baseForbidden).includes(answer) && !isAllowed;
      const reason = (override.reasons && override.reasons[answer]) || (details.allowed.find(x => x.answer === answer)?.reason) || (details.forbidden.find(x => x.answer === answer)?.reason) || "";
      const best = (override.bestAnswer || details.bestAnswer) === answer;
      block.innerHTML = `
        <strong>${LABELS.answers[answer]}</strong>
        <div class="grid2">
          <label><input type="radio" name="state_${answer}" value="allowed" ${isAllowed ? "checked" : ""}> Consentita</label>
          <label><input type="radio" name="state_${answer}" value="forbidden" ${isForbidden ? "checked" : ""}> Esclusa</label>
        </div>
        <label class="muted">Motivazione specifica
          <textarea id="reason_${answer}">${reason}</textarea>
        </label>
        <label><input type="radio" name="bestAnswerRadio" value="${answer}" ${best ? "checked" : ""}> Risposta migliore</label>
      `;
      el.scenarioRuleEditor.appendChild(block);
    });
  }

  function collectScenarioOverride(){
    const allowed = [];
    const forbidden = [];
    const reasons = {};
    CONFIG.answers.forEach(answer => {
      const chosen = document.querySelector(`input[name="state_${answer}"]:checked`);
      const val = chosen ? chosen.value : null;
      if (val === "allowed") allowed.push(answer);
      if (val === "forbidden") forbidden.push(answer);
      const txt = $("reason_" + answer)?.value || "";
      if (txt.trim()) reasons[answer] = txt.trim();
    });
    const bestAnswer = document.querySelector('input[name="bestAnswerRadio"]:checked')?.value || null;
    return { allowed, forbidden, bestAnswer, reasons };
  }

  function buildAdminList(){
    const list = window.ALL_SCENARIOS || [];
    el.scenarioSelect.innerHTML = "";
    list.forEach((s, idx) => {
      const o = document.createElement("option");
      o.value = idx;
      o.textContent = "#" + s.id + " - " + LABELS.situation[s.situation] + " / " + LABELS.calata[s.calata] + " / " + LABELS.base[s.base] + " / " + LABELS.answers[s.correctAnswer];
      el.scenarioSelect.appendChild(o);
    });
    el.archiveCount.textContent = "Archivio: " + list.length;
    if (list.length) loadAdminScenario(0);
  }

  function loadAdminScenario(index){
    const s = window.ALL_SCENARIOS[index];
    if (!s) return;
    el.scenarioSelect.value = index;
    el.editSituation.value = s.situation;
    el.editCalata.value = s.calata;
    el.editBase.value = s.base;
    el.editVittima.value = s.vittima;
    el.editSfregamenti.value = String(s.sfregamenti);
    el.editCordaAnnessa.value = String(s.cordaAnnessa);
    el.editCompagniBase.value = String(s.compagniBase);
    el.editCadutaMassi.value = String(s.cadutaMassi);
    el.editCordaMagazzino.value = s.cordaMagazzino || "SUFFICIENTE";
    renderPreview(s);
    buildOverrideEditor(s);
  }

  function renderPreview(s){
    el.scenarioPreview.textContent = scenarioText(s);
    const details = RULES.evaluateAll(s);
    el.bestAnswerBox.innerHTML = "<strong>Risposta migliore:</strong> " + LABELS.answers[details.bestAnswer] + "<br><small>" + RULES.explain(details.bestAnswer) + "</small>";
    el.allowedBox.innerHTML = details.allowed.map(i => `<div class="item ok"><strong>${LABELS.answers[i.answer]}</strong><br><small>${i.reason}</small></div>`).join("");
    el.forbiddenBox.innerHTML = details.forbidden.map(i => `<div class="item no"><strong>${LABELS.answers[i.answer]}</strong><br><small>${i.reason}</small></div>`).join("");
  }

  function currentEditedScenario(baseScenario){
    return {
      ...baseScenario,
      situation: el.editSituation.value,
      calata: el.editCalata.value,
      base: el.editBase.value,
      vittima: el.editVittima.value,
      sfregamenti: el.editSfregamenti.value === "true",
      cordaAnnessa: el.editCordaAnnessa.value === "true",
      compagniBase: el.editCompagniBase.value === "true",
      cadutaMassi: el.editCadutaMassi.value === "true",
      cordaMagazzino: el.editCordaMagazzino.value
    };
  }

  function previewCurrent(){
    const idx = Number(el.scenarioSelect.value), list = window.ALL_SCENARIOS || [];
    if (!list[idx]) return;
    const preview = SCENARIOS.recalcScenario(currentEditedScenario(list[idx]));
    renderPreview(preview);
    buildOverrideEditor(preview);
    el.result.textContent = "Anteprima aggiornata.";
  }

  function saveScenarioOverrideOnly(s){
    const sig = RULES.scenarioSignature(s);
    RULES.setScenarioOverride(sig, collectScenarioOverride());
  }

  function saveCurrentAdminScenario(){
    const idx = Number(el.scenarioSelect.value), list = window.ALL_SCENARIOS || [];
    if (!list[idx]) return;
    const updated = SCENARIOS.recalcScenario(currentEditedScenario(list[idx]));
    list[idx] = updated;
    SCENARIOS.replaceAllScenarios(list);
    saveScenarioOverrideOnly(updated);
    buildAdminList();
    loadAdminScenario(idx);
    el.result.textContent = "Scenario e override consentite/escluse salvati localmente.";
  }

  function exportScenarios(){
    const blob = new Blob([JSON.stringify(window.ALL_SCENARIOS, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "manual-scenarios.json";
    a.click();
    el.result.textContent = "JSON esportato.";
  }

  function regenerateAllScenarios(){
    const regenerated = SCENARIOS.generateAllScenarios();
    SCENARIOS.replaceAllScenarios(regenerated);
    buildAdminList();
    el.result.textContent = `Rigenerati ${regenerated.length} scenari con le regole correnti.`;
  }

  async function resetLocal(){
    SCENARIOS.clearLocalOverrides();
    RULES.clearDetailOverrides();
    localStorage.removeItem("canyon_scenario_rule_overrides_v13");
    await SCENARIOS.initScenarioStore();
    buildDetailEditors();
    buildAdminList();
    el.result.textContent = "Modifiche locali azzerate. Ripristinati dati ufficiali e override scenario.";
  }

  async function initProtected(){
    Object.assign(el, {
      archiveCount: $("archiveCount"),
      scenarioSelect: $("scenarioSelect"),
      result: $("result"),
      scenarioPreview: $("scenarioPreview"),
      editSituation: $("editSituation"),
      editCalata: $("editCalata"),
      editBase: $("editBase"),
      editVittima: $("editVittima"),
      editSfregamenti: $("editSfregamenti"),
      editCordaAnnessa: $("editCordaAnnessa"),
      editCompagniBase: $("editCompagniBase"),
      editCadutaMassi: $("editCadutaMassi"),
      editCordaMagazzino: $("editCordaMagazzino"),
      saveScenarioBtn: $("saveScenarioBtn"),
      exportBtn: $("exportBtn"),
      regenerateBtn: $("regenerateBtn"),
      resetLocalBtn: $("resetLocalBtn"),
      previewBtn: $("previewBtn"),
      bestAnswerBox: $("bestAnswerBox"),
      allowedBox: $("allowedBox"),
      forbiddenBox: $("forbiddenBox"),
      responseDetailEditor: $("responseDetailEditor"),
      scenarioRuleEditor: $("scenarioRuleEditor")
    });

    populateSelect(el.editSituation, CONFIG.situations, LABELS.situation);
    populateSelect(el.editCalata, CONFIG.calataTypes, LABELS.calata);
    populateSelect(el.editBase, CONFIG.baseTypes, LABELS.base);
    populateSelect(el.editVittima, CONFIG.victimStates, LABELS.vittima);
    populateSelect(el.editCordaMagazzino, CONFIG.cordaMagazzinoStates, LABELS.cordaMagazzino);

    await SCENARIOS.initScenarioStore();
    buildDetailEditors();
    buildAdminList();

    el.scenarioSelect.addEventListener("change", () => loadAdminScenario(Number(el.scenarioSelect.value)));
    el.previewBtn.addEventListener("click", e => { e.preventDefault(); previewCurrent(); });
    el.saveScenarioBtn.addEventListener("click", e => { e.preventDefault(); saveCurrentAdminScenario(); });
    el.exportBtn.addEventListener("click", e => { e.preventDefault(); exportScenarios(); });
    el.regenerateBtn.addEventListener("click", e => { e.preventDefault(); regenerateAllScenarios(); });
    el.resetLocalBtn.addEventListener("click", async e => { e.preventDefault(); await resetLocal(); });
  }

  window.addEventListener("load", () => {
    $("pinBtn").addEventListener("click", checkPin);
    if (localStorage.getItem(PIN_OK_KEY) === "1"){
      showAdmin();
      initProtected();
    }
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
  });
})();