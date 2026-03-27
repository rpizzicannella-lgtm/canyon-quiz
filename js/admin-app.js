(function(){
  let config = null;
  let selectedScenario = null;
  var PIN_OK_KEY = "canyon_admin_pin_ok_v17_3";
  var el = {};
  function $(id){ return document.getElementById(id); }

  function showAdmin(){
    $("pinGate").classList.add("hidden");
    $("adminApp").classList.remove("hidden");
  }

  function setMessage(msg){
    if (el.result) el.result.textContent = msg;
  }

  function saveAndRefresh(msg){
    CONFIG_STORE.saveConfig(config);
    ENGINE.setConfig(config);
    ENGINE.initializeScenarioArchive();
    renderAll();
    setMessage(msg || "Configurazione salvata.");
  }

  function pickJsonFile(onLoad){
    el.fileInput.value = "";
    el.fileInput.onchange = async function(){
      var file = el.fileInput.files[0];
      if(!file) return;
      var text = await file.text();
      onLoad(JSON.parse(text));
    };
    el.fileInput.click();
  }

  function checkPin(){
    if(($("pinInput").value || "").trim() === config.adminPin){
      localStorage.setItem(PIN_OK_KEY, "1");
      showAdmin();
      renderAll();
    } else {
      $("pinMsg").textContent = "PIN non corretto.";
    }
  }

  function parseJsonPrompt(title, templateObj, existingObj){
    var prefill = existingObj ? JSON.stringify(existingObj, null, 2) : JSON.stringify(templateObj, null, 2);
    var raw = prompt(title + "\nInserisci JSON valido.", prefill);
    if(raw === null) return null;
    try {
      return JSON.parse(raw);
    } catch (e) {
      alert("JSON non valido.");
      return null;
    }
  }

  function clone(obj){ return JSON.parse(JSON.stringify(obj)); }

  function saveAndNormalize(msg){
    if(!config.detailOverrides) config.detailOverrides = {};
    if(!config.scenarioOverrides) config.scenarioOverrides = {};
    saveAndRefresh(msg);
  }

  function renderAll(){
    renderSituations();
    renderVariables();
    renderManeuvers();
    renderRules();
    renderScenarios();
    renderDetails();
    el.archiveCount.textContent = "Scenari: " + ENGINE.getScenarios().length;
  }

  function renderSituations(){
    el.situationsList.innerHTML = "";
    config.situations.forEach(function(item){
      var div = document.createElement("div");
      div.className = "item";
      div.innerHTML =
        '<strong>'+item.label+'</strong>' +
        '<div class="mono">'+item.id+'</div>' +
        (item.description ? '<div class="subtle">'+item.description+'</div>' : '') +
        '<div class="small-actions">' +
        '<button data-id="'+item.id+'" class="edit-situation">Modifica completa</button>' +
        '<button data-id="'+item.id+'" class="duplicate-situation">Duplica</button>' +
        '<button data-id="'+item.id+'" class="delete-situation">Elimina</button>' +
        '</div>';
      el.situationsList.appendChild(div);
    });
    document.querySelectorAll(".edit-situation").forEach(function(btn){ btn.onclick = function(){ editSituation(btn.dataset.id); }; });
    document.querySelectorAll(".duplicate-situation").forEach(function(btn){ btn.onclick = function(){ duplicateSituation(btn.dataset.id); }; });
    document.querySelectorAll(".delete-situation").forEach(function(btn){ btn.onclick = function(){ deleteSituation(btn.dataset.id); }; });
  }

  function addSituation(){
    var template = { id:"NUOVA_SITUAZIONE", label:"Nuova Situazione", description:"" };
    var obj = parseJsonPrompt("Nuova situazione", template, null);
    if(!obj || !obj.id || !obj.label) return;
    config.situations.push(obj);
    saveAndNormalize("Situazione aggiunta.");
  }

  function editSituation(id){
    var idx = config.situations.findIndex(function(x){ return x.id === id; });
    if(idx < 0) return;
    var oldId = config.situations[idx].id;
    var obj = parseJsonPrompt("Modifica completa situazione", config.situations[idx], config.situations[idx]);
    if(!obj || !obj.id || !obj.label) return;
    config.situations[idx] = obj;
    config.rules.forEach(function(r){
      (r.conditions || []).forEach(function(c){
        if(c.field === "situation"){
          if(c.value === oldId) c.value = obj.id;
          if(Array.isArray(c.value)) c.value = c.value.map(function(v){ return v === oldId ? obj.id : v; });
        }
      });
    });
    saveAndNormalize("Situazione aggiornata.");
  }

  function duplicateSituation(id){
    var it = config.situations.find(function(x){ return x.id === id; });
    if(!it) return;
    var cp = clone(it);
    cp.id = cp.id + "_COPY";
    cp.label = cp.label + " copia";
    config.situations.push(cp);
    saveAndNormalize("Situazione duplicata.");
  }

  function deleteSituation(id){
    if(!confirm("Eliminare la situazione?")) return;
    config.situations = config.situations.filter(function(x){ return x.id !== id; });
    saveAndNormalize("Situazione eliminata.");
  }

  function renderVariables(){
    el.variablesList.innerHTML = "";
    config.variables.forEach(function(v){
      var values = (v.values || []).map(function(x){ return x.label + " [" + x.id + "]"; }).join(", ");
      var div = document.createElement("div");
      div.className = "item";
      div.innerHTML =
        '<strong>'+v.label+'</strong>' +
        '<div class="mono">'+v.id+'</div>' +
        '<div class="subtle">'+values+'</div>' +
        '<div class="small-actions">' +
        '<button data-id="'+v.id+'" class="edit-variable">Modifica completa</button>' +
        '<button data-id="'+v.id+'" class="duplicate-variable">Duplica</button>' +
        '<button data-id="'+v.id+'" class="delete-variable">Elimina</button>' +
        '</div>';
      el.variablesList.appendChild(div);
    });
    document.querySelectorAll(".edit-variable").forEach(function(btn){ btn.onclick = function(){ editVariable(btn.dataset.id); }; });
    document.querySelectorAll(".duplicate-variable").forEach(function(btn){ btn.onclick = function(){ duplicateVariable(btn.dataset.id); }; });
    document.querySelectorAll(".delete-variable").forEach(function(btn){ btn.onclick = function(){ deleteVariable(btn.dataset.id); }; });
  }

  function addVariable(){
    var template = { id:"nuova_variabile", label:"Nuova variabile", values:[{id:"VALORE_1", label:"Valore 1"},{id:"VALORE_2", label:"Valore 2"}] };
    var obj = parseJsonPrompt("Nuova variabile scenario", template, null);
    if(!obj || !obj.id || !obj.label || !Array.isArray(obj.values)) return;
    config.variables.push(obj);
    saveAndNormalize("Variabile aggiunta.");
  }

  function editVariable(id){
    var idx = config.variables.findIndex(function(x){ return x.id === id; });
    if(idx < 0) return;
    var oldId = config.variables[idx].id;
    var obj = parseJsonPrompt("Modifica completa variabile", config.variables[idx], config.variables[idx]);
    if(!obj || !obj.id || !obj.label || !Array.isArray(obj.values)) return;
    config.variables[idx] = obj;
    config.rules.forEach(function(r){
      (r.conditions || []).forEach(function(c){
        if(c.field === oldId) c.field = obj.id;
      });
    });
    saveAndNormalize("Variabile aggiornata.");
  }

  function duplicateVariable(id){
    var it = config.variables.find(function(x){ return x.id === id; });
    if(!it) return;
    var cp = clone(it);
    cp.id = cp.id + "_copy";
    cp.label = cp.label + " copia";
    config.variables.push(cp);
    saveAndNormalize("Variabile duplicata.");
  }

  function deleteVariable(id){
    if(!confirm("Eliminare la variabile?")) return;
    config.variables = config.variables.filter(function(x){ return x.id !== id; });
    saveAndNormalize("Variabile eliminata.");
  }

  function renderManeuvers(){
    el.maneuversList.innerHTML = "";
    config.maneuvers.forEach(function(m){
      var div = document.createElement("div");
      div.className = "item";
      div.innerHTML =
        '<strong>'+m.label+'</strong>' +
        '<div class="mono">'+m.id+'</div>' +
        '<div class="subtle">Durata: '+m.durationMinutes+' min · Rischio: '+m.risk+' · Priorità base: '+m.basePriority+(m.specialNone ? ' · specialNone' : '')+'</div>' +
        '<div class="small-actions">' +
        '<button data-id="'+m.id+'" class="edit-maneuver">Modifica completa</button>' +
        '<button data-id="'+m.id+'" class="duplicate-maneuver">Duplica</button>' +
        '<button data-id="'+m.id+'" class="delete-maneuver">Elimina</button>' +
        '</div>';
      el.maneuversList.appendChild(div);
    });
    document.querySelectorAll(".edit-maneuver").forEach(function(btn){ btn.onclick = function(){ editManeuver(btn.dataset.id); }; });
    document.querySelectorAll(".duplicate-maneuver").forEach(function(btn){ btn.onclick = function(){ duplicateManeuver(btn.dataset.id); }; });
    document.querySelectorAll(".delete-maneuver").forEach(function(btn){ btn.onclick = function(){ deleteManeuver(btn.dataset.id); }; });
  }

  function addManeuver(){
    var template = { id:"NUOVA_MANOVRA", label:"Nuova manovra", durationMinutes:2, risk:"basso", basePriority:5, specialNone:false };
    var obj = parseJsonPrompt("Nuova manovra", template, null);
    if(!obj || !obj.id || !obj.label) return;
    config.maneuvers.push(obj);
    saveAndNormalize("Manovra aggiunta.");
  }

  function editManeuver(id){
    var idx = config.maneuvers.findIndex(function(x){ return x.id === id; });
    if(idx < 0) return;
    var oldId = config.maneuvers[idx].id;
    var obj = parseJsonPrompt("Modifica completa manovra", config.maneuvers[idx], config.maneuvers[idx]);
    if(!obj || !obj.id || !obj.label) return;
    config.maneuvers[idx] = obj;
    config.rules.forEach(function(r){
      if(r.maneuvers) r.maneuvers = r.maneuvers.map(function(x){ return x === oldId ? obj.id : x; });
      if(r.priority) r.priority = r.priority.map(function(x){ return x === oldId ? obj.id : x; });
    });
    if(config.detailOverrides[oldId]){
      config.detailOverrides[obj.id] = config.detailOverrides[oldId];
      delete config.detailOverrides[oldId];
    }
    saveAndNormalize("Manovra aggiornata.");
  }

  function duplicateManeuver(id){
    var it = config.maneuvers.find(function(x){ return x.id === id; });
    if(!it) return;
    var cp = clone(it);
    cp.id = cp.id + "_COPY";
    cp.label = cp.label + " copia";
    cp.specialNone = false;
    config.maneuvers.push(cp);
    saveAndNormalize("Manovra duplicata.");
  }

  function deleteManeuver(id){
    if(!confirm("Eliminare la manovra?")) return;
    config.maneuvers = config.maneuvers.filter(function(x){ return x.id !== id; });
    config.rules.forEach(function(r){
      if(r.maneuvers) r.maneuvers = r.maneuvers.filter(function(x){ return x !== id; });
      if(r.priority) r.priority = r.priority.filter(function(x){ return x !== id; });
    });
    delete config.detailOverrides[id];
    saveAndNormalize("Manovra eliminata.");
  }

  function summarizeRule(r){
    var cond = (r.conditions || []).map(function(c){ return c.field + " " + c.op + " " + (Array.isArray(c.value) ? c.value.join("|") : c.value); }).join(" ; ");
    var payload = r.type === "priority" ? (r.priority || []).join(" > ") : (r.maneuvers || []).join(", ");
    return r.type.toUpperCase() + " · " + cond + " · " + payload;
  }

  function renderRules(){
    el.rulesList.innerHTML = "";
    config.rules.forEach(function(r){
      var div = document.createElement("div");
      div.className = "item";
      div.innerHTML =
        '<strong>'+r.name+'</strong>' +
        '<div class="mono">'+r.id+'</div>' +
        '<div class="subtle">'+summarizeRule(r)+'</div>' +
        '<div class="subtle">'+(r.note || "")+'</div>' +
        '<div class="small-actions">' +
        '<button data-id="'+r.id+'" class="edit-rule">Modifica completa</button>' +
        '<button data-id="'+r.id+'" class="duplicate-rule">Duplica</button>' +
        '<button data-id="'+r.id+'" class="toggle-rule">'+(r.enabled ? "Disattiva" : "Attiva")+'</button>' +
        '<button data-id="'+r.id+'" class="delete-rule">Elimina</button>' +
        '</div>';
      el.rulesList.appendChild(div);
    });
    document.querySelectorAll(".edit-rule").forEach(function(btn){ btn.onclick = function(){ editRule(btn.dataset.id); }; });
    document.querySelectorAll(".duplicate-rule").forEach(function(btn){ btn.onclick = function(){ duplicateRule(btn.dataset.id); }; });
    document.querySelectorAll(".toggle-rule").forEach(function(btn){ btn.onclick = function(){ toggleRule(btn.dataset.id); }; });
    document.querySelectorAll(".delete-rule").forEach(function(btn){ btn.onclick = function(){ deleteRule(btn.dataset.id); }; });
  }

  function addRule(){
    var template = { id:"NUOVA_REGOLA", name:"Nuova regola", type:"allow", enabled:true, conditions:[{field:"calata", op:"eq", value:"CASCATA"}], maneuvers:["DIRETTO_SINGOLA"], note:"" };
    var obj = parseJsonPrompt("Nuova regola completa", template, null);
    if(!obj || !obj.id || !obj.name || !obj.type) return;
    config.rules.push(obj);
    saveAndNormalize("Regola aggiunta.");
  }

  function editRule(id){
    var idx = config.rules.findIndex(function(x){ return x.id === id; });
    if(idx < 0) return;
    var obj = parseJsonPrompt("Modifica completa regola", config.rules[idx], config.rules[idx]);
    if(!obj || !obj.id || !obj.name || !obj.type) return;
    config.rules[idx] = obj;
    saveAndNormalize("Regola aggiornata.");
  }

  function duplicateRule(id){
    var it = config.rules.find(function(x){ return x.id === id; });
    if(!it) return;
    var cp = clone(it);
    cp.id = cp.id + "_COPY";
    cp.name = cp.name + " copia";
    config.rules.push(cp);
    saveAndNormalize("Regola duplicata.");
  }

  function toggleRule(id){
    var rule = config.rules.find(function(x){ return x.id === id; });
    if(!rule) return;
    rule.enabled = !rule.enabled;
    saveAndNormalize("Stato regola aggiornato.");
  }

  function deleteRule(id){
    if(!confirm("Eliminare la regola?")) return;
    config.rules = config.rules.filter(function(x){ return x.id !== id; });
    saveAndNormalize("Regola eliminata.");
  }

  function renderScenarios(){
    var scenarios = ENGINE.getScenarios();
    el.scenarioSelect.innerHTML = "";
    scenarios.forEach(function(s, idx){
      var o = document.createElement("option");
      o.value = idx;
      o.textContent = "#" + s.id + " - " + ENGINE.labelForSituation(s.situation) + " / " + ENGINE.labelForManeuver(s.correctAnswer);
      el.scenarioSelect.appendChild(o);
    });
    if(scenarios.length) loadScenarioByIndex(0);
  }

  function loadScenarioByIndex(index){
    selectedScenario = ENGINE.getScenarioByIndex(index);
    if(!selectedScenario) return;
    selectedScenario = ENGINE.recalcScenario(selectedScenario);
    el.scenarioPreview.textContent = ENGINE.scenarioText(selectedScenario) + "\nRisposta attuale: " + ENGINE.labelForManeuver(selectedScenario.correctAnswer);
    var details = ENGINE.evaluateScenario(selectedScenario);
    el.bestAnswerBox.innerHTML = "<strong>Risposta migliore:</strong> " + ENGINE.labelForManeuver(details.bestAnswer) + "<br><small>" + details.reason + "</small>";
    el.allowedBox.innerHTML = details.allowed.map(function(i){ return '<div class="item ok"><strong>'+ENGINE.labelForManeuver(i.answer)+'</strong><br><small>'+i.reason+'</small></div>'; }).join("");
    el.forbiddenBox.innerHTML = details.forbidden.map(function(i){ return '<div class="item no"><strong>'+ENGINE.labelForManeuver(i.answer)+'</strong><br><small>'+i.reason+'</small></div>'; }).join("");
    buildScenarioOverrideEditor(selectedScenario, details);
  }

  function buildScenarioOverrideEditor(s, details){
    var sig = ENGINE.scenarioSignature(s);
    var override = config.scenarioOverrides[sig] || {};
    el.scenarioRuleEditor.innerHTML = "";
    config.maneuvers.forEach(function(m){
      var allowedBase = override.allowed || details.allowed.map(function(x){ return x.answer; });
      var forbiddenBase = override.forbidden || details.forbidden.map(function(x){ return x.answer; });
      var isAllowed = allowedBase.indexOf(m.id) >= 0;
      var isForbidden = forbiddenBase.indexOf(m.id) >= 0 && !isAllowed;
      var best = (override.bestAnswer || details.bestAnswer) === m.id;
      var foundAllowed = details.allowed.find(function(x){ return x.answer === m.id; });
      var foundForbidden = details.forbidden.find(function(x){ return x.answer === m.id; });
      var reason = (override.reasons && override.reasons[m.id]) || (foundAllowed ? foundAllowed.reason : "") || (foundForbidden ? foundForbidden.reason : "") || "";
      var block = document.createElement("div");
      block.className = "item";
      block.innerHTML = '<strong>'+m.label+'</strong><div class="radio-row"><label><input type="radio" name="state_'+m.id+'" value="allowed" '+(isAllowed ? "checked" : "")+'> Consentita</label><label><input type="radio" name="state_'+m.id+'" value="forbidden" '+(isForbidden ? "checked" : "")+'> Esclusa</label></div><label class="subtle">Motivazione specifica</label><textarea id="reason_'+m.id+'">'+reason+'</textarea><label><input type="radio" name="bestAnswerRadio" value="'+m.id+'" '+(best ? "checked" : "")+'> Risposta migliore</label>';
      el.scenarioRuleEditor.appendChild(block);
    });
  }

  function saveScenarioOverride(){
    if(!selectedScenario) return;
    var sig = ENGINE.scenarioSignature(selectedScenario);
    var allowed = [], forbidden = [], reasons = {};
    config.maneuvers.forEach(function(m){
      var chosen = document.querySelector('input[name="state_'+m.id+'"]:checked');
      if(chosen && chosen.value === "allowed") allowed.push(m.id);
      if(chosen && chosen.value === "forbidden") forbidden.push(m.id);
      var reasonEl = document.getElementById("reason_" + m.id);
      var reason = reasonEl ? reasonEl.value.trim() : "";
      if(reason) reasons[m.id] = reason;
    });
    var bestEl = document.querySelector('input[name="bestAnswerRadio"]:checked');
    var bestAnswer = bestEl ? bestEl.value : null;
    config.scenarioOverrides[sig] = { allowed:allowed, forbidden:forbidden, bestAnswer:bestAnswer, reasons:reasons };
    saveAndNormalize("Override scenario salvato.");
    loadScenarioByIndex(Number(el.scenarioSelect.value || 0));
  }

  function renderDetails(){
    el.detailsEditor.innerHTML = "";
    var defaults = ENGINE.getDefaultDetailTexts();
    config.maneuvers.forEach(function(m){
      var div = document.createElement("div");
      div.className = "item";
      div.innerHTML = '<strong>'+m.label+'</strong><textarea id="detail_'+m.id+'">'+(defaults[m.id] || "")+'</textarea><div class="small-actions"><button data-id="'+m.id+'" class="save-detail">Salva dettaglio</button></div>';
      el.detailsEditor.appendChild(div);
    });
    document.querySelectorAll(".save-detail").forEach(function(btn){
      btn.onclick = function(){
        var id = btn.dataset.id;
        config.detailOverrides[id] = document.getElementById("detail_" + id).value;
        saveAndNormalize("Dettaglio manovra salvato.");
        loadScenarioByIndex(Number(el.scenarioSelect.value || 0));
      };
    });
  }

  async function init(){
    el.archiveCount = $("archiveCount");
    el.result = $("result");
    el.fileInput = $("fileInput");
    el.situationsList = $("situationsList");
    el.variablesList = $("variablesList");
    el.maneuversList = $("maneuversList");
    el.rulesList = $("rulesList");
    el.scenarioSelect = $("scenarioSelect");
    el.scenarioPreview = $("scenarioPreview");
    el.bestAnswerBox = $("bestAnswerBox");
    el.allowedBox = $("allowedBox");
    el.forbiddenBox = $("forbiddenBox");
    el.scenarioRuleEditor = $("scenarioRuleEditor");
    el.detailsEditor = $("detailsEditor");

    config = await CONFIG_STORE.loadConfig();
    ENGINE.setConfig(config);
    ENGINE.initializeScenarioArchive();

    $("pinBtn").addEventListener("click", checkPin);
    if(localStorage.getItem(PIN_OK_KEY) === "1"){
      showAdmin();
      renderAll();
    }

    $("addSituationBtn").addEventListener("click", addSituation);
    $("addVariableBtn").addEventListener("click", addVariable);
    $("addManeuverBtn").addEventListener("click", addManeuver);
    $("addRuleBtn").addEventListener("click", addRule);
    $("regenerateBtn").addEventListener("click", function(){ saveAndNormalize("Scenari rigenerati."); });
    $("previewBtn").addEventListener("click", function(){ loadScenarioByIndex(Number(el.scenarioSelect.value || 0)); });
    $("saveScenarioOverrideBtn").addEventListener("click", saveScenarioOverride);
    $("scenarioSelect").addEventListener("change", function(){ loadScenarioByIndex(Number(el.scenarioSelect.value || 0)); });
    $("exportBundleBtn").addEventListener("click", function(){
      var blob = new Blob([JSON.stringify(config, null, 2)], { type:"application/json" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "canyon-config-bundle.json";
      a.click();
    });
    $("importBundleBtn").addEventListener("click", function(){
      pickJsonFile(function(bundle){ config = bundle; saveAndNormalize("Configurazione importata."); });
    });
    $("resetLocalBtn").addEventListener("click", async function(){
      CONFIG_STORE.clearLocalConfig();
      config = await CONFIG_STORE.loadDefaultConfig();
      saveAndNormalize("Configurazione locale azzerata.");
    });

    if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
  }

  window.addEventListener("load", init);
})();