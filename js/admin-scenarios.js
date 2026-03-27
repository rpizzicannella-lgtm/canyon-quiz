(function(){
  var selectedScenario = null, audience = "ACCOMPAGNATORE";

  function renderDebug(details){
    var box = document.getElementById("debugBox");
    if(!box) return;
    var riskChecks = (details.riskDebug && details.riskDebug.checks || []).map(function(c){
      var expected = Array.isArray(c.expected) ? c.expected.join(", ") : c.expected;
      return '<div class="debug-rule"><strong>' + c.field + '</strong>: attuale = ' + c.actual + ' · atteso = ' + expected + ' · esito = ' + (c.matched ? 'OK' : 'NO') + '</div>';
    }).join('');
    var riskBox = '<div class="item debug-card best"><strong>Contesto decisionale</strong><div class="debug-meta">Rischio: ' + ENGINE.labelForRiskLevel(details.riskLevel) + ' · Urgenza: ' + ENGINE.labelForUrgencyLevel(details.urgencyLevel) + '</div>' + (details.riskDebug && details.riskDebug.matchedRule ? '<div class="debug-rule"><strong>Regola rischio:</strong> ' + details.riskDebug.matchedRule.name + ' [' + details.riskDebug.matchedRule.id + ']</div>' : '<div class="debug-rule"><strong>Regola rischio:</strong> fallback MEDIO</div>') + riskChecks + (details.decisionContext && details.decisionContext.notes ? details.decisionContext.notes.map(function(n){ return '<div class="debug-rule">' + n + '</div>'; }).join('') : '') + '</div>';
    var maneuverBoxes = (details.debug || []).map(function(d){
      var cls = d.sceltaFinale ? 'debug-card best' : (d.statoFinale === 'Consentita' ? 'debug-card ok' : 'debug-card no');
      var cons = d.consentitaDa.length ? d.consentitaDa.map(function(r){ return '<div class="debug-rule"><strong>Consentita da:</strong> ' + r.ruleName + ' [' + r.ruleId + ']<br><small>' + r.note + '</small></div>'; }).join('') : '';
      var escl = d.esclusaDa.length ? d.esclusaDa.map(function(r){ return '<div class="debug-rule"><strong>Esclusa da:</strong> ' + r.ruleName + ' [' + r.ruleId + ']<br><small>' + r.note + '</small></div>'; }).join('') : '';
      var over = d.override.length ? d.override.map(function(r){ return '<div class="debug-rule"><strong>Override:</strong> ' + r.note + '</div>'; }).join('') : '';
      return '<div class="item ' + cls + '"><strong>' + d.label + '</strong><div class="debug-meta">Stato finale: ' + d.statoFinale + ' · Profilo manovra: ' + ENGINE.labelForAudience(d.targetAudience) + '</div>' + (d.sceltaFinale ? '<div class="debug-rule"><strong>Scelta finale:</strong> ' + (d.motivoScelta || 'Selezionata dal motore.') + '</div>' : '') + cons + escl + over + '</div>';
    }).join('');
    box.innerHTML = riskBox + maneuverBoxes;
  }

  function renderScenarios(){
    ENGINE.setAudienceMode(audience);
    ENGINE.initializeScenarioArchive();
    var sel = document.getElementById("scenarioSelect");
    sel.innerHTML = "";
    ENGINE.getScenarios().forEach(function(s, idx){
      var recalced = ENGINE.recalcScenario(s);
      var o = document.createElement("option");
      o.value = idx;
      o.textContent = "#" + recalced.id + " - " + ENGINE.labelForSituation(recalced.situation) + " / " + ENGINE.labelForManeuver(recalced.correctAnswer);
      sel.appendChild(o);
    });
    if(ENGINE.getScenarios().length) loadScenarioByIndex(0);
    var archive = document.getElementById("archiveCount");
    if(archive) archive.textContent = "Scenari: " + ENGINE.getScenarios().length;
  }

  function loadScenarioByIndex(index){
    selectedScenario = ENGINE.getScenarioByIndex(index);
    if(!selectedScenario) return;
    selectedScenario = ENGINE.recalcScenario(selectedScenario);
    document.getElementById("scenarioPreview").textContent = ENGINE.scenarioText(selectedScenario) + "\nRisposta attuale: " + ENGINE.labelForManeuver(selectedScenario.correctAnswer);
    var details = ENGINE.evaluateScenario(selectedScenario);
    document.getElementById("bestAnswerBox").innerHTML = "<strong>Risposta migliore:</strong> " + ENGINE.labelForManeuver(details.bestAnswer) + "<br><small>" + details.reason + "</small>";
    document.getElementById("allowedBox").innerHTML = details.allowed.map(function(i){ return '<div class="item ok"><strong>'+ENGINE.labelForManeuver(i.answer)+'</strong><br><small>'+i.reason+'</small></div>'; }).join("");
    document.getElementById("forbiddenBox").innerHTML = details.forbidden.map(function(i){ return '<div class="item no"><strong>'+ENGINE.labelForManeuver(i.answer)+'</strong><br><small>'+i.reason+'</small></div>'; }).join("");
    renderDebug(details);
    buildScenarioOverrideEditor(selectedScenario, details);
    renderDetails();
  }

  function buildScenarioOverrideEditor(s, details){
    var sig = ENGINE.scenarioSignature(s);
    var override = ADMIN_COMMON.config.scenarioOverrides[sig] || {};
    var box = document.getElementById("scenarioRuleEditor");
    box.innerHTML = "";
    ADMIN_COMMON.config.maneuvers.forEach(function(m){
      var allowedBase = override.allowed || details.allowed.map(function(x){ return x.answer; });
      var forbiddenBase = override.forbidden || details.forbidden.map(function(x){ return x.answer; });
      var isAllowed = allowedBase.indexOf(m.id) >= 0;
      var isForbidden = forbiddenBase.indexOf(m.id) >= 0 && !isAllowed;
      var best = (override.bestAnswer || details.bestAnswer) === m.id;
      var foundAllowed = details.allowed.find(function(x){ return x.answer === m.id; });
      var foundForbidden = details.forbidden.find(function(x){ return x.answer === m.id; });
      var reason = (override.reasons && override.reasons[m.id]) || (foundAllowed ? foundAllowed.reason : "") || (foundForbidden ? foundForbidden.reason : "") || "";
      var div = document.createElement("div");
      div.className = "item";
      div.innerHTML = '<strong>'+m.label+'</strong><div class="radio-row"><label><input type="radio" name="state_'+m.id+'" value="allowed" '+(isAllowed ? "checked" : "")+'> Consentita</label><label><input type="radio" name="state_'+m.id+'" value="forbidden" '+(isForbidden ? "checked" : "")+'> Esclusa</label></div><label class="subtle">Motivazione specifica</label><textarea id="reason_'+m.id+'">'+reason+'</textarea><label><input type="radio" name="bestAnswerRadio" value="'+m.id+'" '+(best ? "checked" : "")+'> Risposta migliore</label>';
      box.appendChild(div);
    });
  }

  function saveScenarioOverride(){
    if(!selectedScenario) return;
    var sig = ENGINE.scenarioSignature(selectedScenario);
    var allowed = [], forbidden = [], reasons = {};
    ADMIN_COMMON.config.maneuvers.forEach(function(m){
      var chosen = document.querySelector('input[name="state_'+m.id+'"]:checked');
      if(chosen && chosen.value === "allowed") allowed.push(m.id);
      if(chosen && chosen.value === "forbidden") forbidden.push(m.id);
      var reasonEl = document.getElementById("reason_" + m.id);
      var reason = reasonEl ? reasonEl.value.trim() : "";
      if(reason) reasons[m.id] = reason;
    });
    var bestEl = document.querySelector('input[name="bestAnswerRadio"]:checked');
    var bestAnswer = bestEl ? bestEl.value : null;
    ADMIN_COMMON.config.scenarioOverrides[sig] = { allowed:allowed, forbidden:forbidden, bestAnswer:bestAnswer, reasons:reasons };
    ADMIN_COMMON.save("Override scenario salvato.");
    loadScenarioByIndex(Number(document.getElementById("scenarioSelect").value || 0));
  }

  function promoteOverrideToGlobalRule(){
    if(!selectedScenario) return;
    var sig = ENGINE.scenarioSignature(selectedScenario);
    var override = ADMIN_COMMON.config.scenarioOverrides[sig];
    if(!override){
      document.getElementById("result").textContent = "Nessun override presente su questo scenario.";
      return;
    }

    var conditionList = [{ field:"situation", op:"eq", value:selectedScenario.situation }];
    (ADMIN_COMMON.config.variables || []).forEach(function(v){
      conditionList.push({ field:v.id, op:"eq", value:selectedScenario[v.id] });
    });

    var created = [];

    if(Array.isArray(override.allowed) && override.allowed.length){
      var allowRule = {
        id: "OVR_GLOBAL_ALLOW_" + Date.now(),
        name: "Da override scenario #" + selectedScenario.id + " - consenti",
        type: "allow",
        enabled: true,
        conditions: conditionList,
        maneuvers: override.allowed.slice(),
        note: "Regola globale creata da override scenario #" + selectedScenario.id
      };
      ADMIN_COMMON.config.rules.push(allowRule);
      created.push(allowRule.id);
    }

    if(Array.isArray(override.forbidden) && override.forbidden.length){
      var excludeRule = {
        id: "OVR_GLOBAL_EXCLUDE_" + Date.now(),
        name: "Da override scenario #" + selectedScenario.id + " - escludi",
        type: "exclude",
        enabled: true,
        conditions: conditionList,
        maneuvers: override.forbidden.slice(),
        note: "Regola globale creata da override scenario #" + selectedScenario.id
      };
      ADMIN_COMMON.config.rules.push(excludeRule);
      created.push(excludeRule.id);
    }

    if(override.bestAnswer){
      var priority = [override.bestAnswer];
      (override.allowed || []).forEach(function(m){
        if(priority.indexOf(m) < 0) priority.push(m);
      });
      var prioRule = {
        id: "OVR_GLOBAL_PRIORITY_" + Date.now(),
        name: "Da override scenario #" + selectedScenario.id + " - priorità",
        type: "priority",
        enabled: true,
        conditions: conditionList,
        priority: priority,
        note: "Regola globale di priorità creata da override scenario #" + selectedScenario.id
      };
      ADMIN_COMMON.config.rules.push(prioRule);
      created.push(prioRule.id);
    }

    ADMIN_COMMON.save("Override trasformato in regole globali: " + created.join(", "));
    loadScenarioByIndex(Number(document.getElementById("scenarioSelect").value || 0));
  }

  function exportAiDataset(){
    ENGINE.setAudienceMode(audience);
    var scenarios = ENGINE.getScenarios().map(function(s){
      var recalced = ENGINE.recalcScenario(s);
      var details = ENGINE.evaluateScenario(recalced);
      return {
        scenario_id: recalced.id,
        scenario_signature: ENGINE.scenarioSignature(recalced),
        profilo: audience,
        situazione: recalced.situation,
        situazione_label: ENGINE.labelForSituation(recalced.situation),
        features: (ADMIN_COMMON.config.variables || []).reduce(function(acc, v){
          acc[v.id] = recalced[v.id];
          acc[v.id + "_label"] = ENGINE.labelForVariableValue(v.id, recalced[v.id]);
          return acc;
        }, {}),
        correct_answer: recalced.correctAnswer,
        correct_answer_label: ENGINE.labelForManeuver(recalced.correctAnswer),
        allowed_maneuvers: details.allowed.map(function(x){ return x.answer; }),
        allowed_maneuvers_label: details.allowed.map(function(x){ return ENGINE.labelForManeuver(x.answer); }),
        forbidden_maneuvers: details.forbidden.map(function(x){ return x.answer; }),
        forbidden_maneuvers_label: details.forbidden.map(function(x){ return ENGINE.labelForManeuver(x.answer); }),
        reason: recalced.reason,
        debug: details.debug,
        has_override: !!ADMIN_COMMON.config.scenarioOverrides[ENGINE.scenarioSignature(recalced)]
      };
    });

    var payload = {
      exported_at: new Date().toISOString(),
      app_version: APP_META.version,
      profilo: audience,
      schema_version: "ai-dataset-v1",
      config_summary: {
        situations: (ADMIN_COMMON.config.situations || []).length,
        variables: (ADMIN_COMMON.config.variables || []).length,
        maneuvers: (ADMIN_COMMON.config.maneuvers || []).length,
        rules: (ADMIN_COMMON.config.rules || []).length
      },
      scenarios: scenarios
    };

    var blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "canyon-ai-dataset-" + audience.toLowerCase() + ".json";
    a.click();
    document.getElementById("result").textContent = "Dataset AI esportato.";
  }

  function renderDetails(){
    var defaults = ENGINE.getDefaultDetailTexts();
    var box = document.getElementById("detailsEditor");
    box.innerHTML = "";
    ADMIN_COMMON.config.maneuvers.forEach(function(m){
      var div = document.createElement("div");
      div.className = "item";
      div.innerHTML = '<strong>'+m.label+'</strong><textarea id="detail_'+m.id+'">'+(defaults[m.id] || "")+'</textarea><div class="small-actions"><button data-id="'+m.id+'" class="save-detail">Salva dettaglio</button></div>';
      box.appendChild(div);
    });
    document.querySelectorAll(".save-detail").forEach(function(btn){
      btn.onclick = function(){
        var id = btn.dataset.id;
        ADMIN_COMMON.config.detailOverrides[id] = document.getElementById("detail_" + id).value;
        ADMIN_COMMON.save("Dettaglio manovra salvato.");
        loadScenarioByIndex(Number(document.getElementById("scenarioSelect").value || 0));
      };
    });
  }

  async function init(){
    await ADMIN_COMMON.initBase();
    ADMIN_COMMON.requireAdmin(function(){
      var controlsCard = document.querySelector(".controls.card");
      if(controlsCard && !document.getElementById("audienceAdminSelect")){
        var wrap = document.createElement("section");
        wrap.className = "card";
        wrap.innerHTML = '<div class="section-title">Profilo modalità istruttore</div><label class="stacked">Profilo<select id="audienceAdminSelect"><option value="ACCOMPAGNATORE" selected>Accompagnatore</option><option value="GUIDA">Guida</option></select></label>';
        controlsCard.insertAdjacentElement("afterend", wrap);
        document.getElementById("audienceAdminSelect").addEventListener("change", function(){
          audience = this.value;
          ENGINE.setAudienceMode(audience);
          renderScenarios();
        });
      }
      renderScenarios();
      document.getElementById("scenarioSelect").addEventListener("change", function(){ loadScenarioByIndex(Number(this.value || 0)); });
      document.getElementById("previewBtn").addEventListener("click", function(){ loadScenarioByIndex(Number(document.getElementById("scenarioSelect").value || 0)); });
      document.getElementById("saveScenarioOverrideBtn").addEventListener("click", saveScenarioOverride);
      document.getElementById("promoteOverrideBtn").addEventListener("click", promoteOverrideToGlobalRule);
      document.getElementById("exportAiDatasetBtn").addEventListener("click", exportAiDataset);
    });
  }
  window.addEventListener("load", init);
})();