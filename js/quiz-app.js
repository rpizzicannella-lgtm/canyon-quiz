(function(){
  let config = null;
  let currentScenario = null, score = 0, questions = 0, errors = 0, timer = null, secondsLeft = 0, quizActive = false, mode = "QUIZ";
  let selectedTime = 12, totalQuestionsTarget = 10, quizFinished = false, sessionStarted = false, resultsLog = [], audience = 'ACCOMPAGNATORE';
  const el = {}; const $ = id => document.getElementById(id);


  function renderAuthUi(){
    const user = AUTH.getUser();
    const badge = el.userBadge, loginBtn = el.loginBtn, logoutBtn = el.logoutBtn, adminLink = el.adminLinkTop;
    if(!badge || !loginBtn || !logoutBtn || !adminLink) return;
    if(user){
      badge.textContent = user.username + " (" + user.role + ")";
      loginBtn.classList.add("hidden");
      logoutBtn.classList.remove("hidden");
      adminLink.classList.toggle("hidden", user.role !== "admin");
    } else {
      badge.textContent = "Guest";
      loginBtn.classList.remove("hidden");
      logoutBtn.classList.add("hidden");
      adminLink.classList.add("hidden");
    }
  }
  function bindAuthUi(){
    if(el.loginBtn) el.loginBtn.addEventListener("click", () => {
      const username = prompt("Username");
      if(username === null) return;
      const password = prompt("Password");
      if(password === null) return;
      const res = AUTH.login(username.trim(), password);
      if(!res.ok){ alert("Credenziali non valide."); return; }
      renderAuthUi();
    });
    if(el.logoutBtn) el.logoutBtn.addEventListener("click", () => {
      AUTH.logout();
      renderAuthUi();
    });
  }

  function renderAnswers(){
    el.answers.innerHTML = "";
    (config.maneuvers || []).filter(m => ((m.targetAudience || 'ENTRAMBI') === 'ENTRAMBI' || (m.targetAudience || 'ENTRAMBI') === audience)).forEach(m => {
      const btn = document.createElement("button");
      btn.type = "button"; btn.className = "answer-btn"; btn.textContent = m.label; btn.dataset.answer = m.id;
      btn.disabled = !quizActive || mode !== "QUIZ" || quizFinished;
      btn.addEventListener("click", () => handleAnswer(m.id, btn));
      el.answers.appendChild(btn);
    });
  }
  function renderStats(){
    el.scoreValue.textContent = score; el.questionValue.textContent = questions; el.errorsValue.textContent = errors;
    el.questionBadge.textContent = "Q" + questions + "/" + totalQuestionsTarget;
    el.modeBadge.textContent = mode === "QUIZ" ? "Quiz" : "Istruttore";
    el.versionBadge.textContent = "Versione " + APP_META.version;
  }
  function stopTimer(){ if(timer){ clearInterval(timer); timer = null; } }
  function startTimerForScenario(){
    stopTimer(); secondsLeft = selectedTime; el.timerBadge.textContent = secondsLeft + "s";
    timer = setInterval(() => {
      secondsLeft--; el.timerBadge.textContent = secondsLeft + "s";
      if(secondsLeft <= 0){
        stopTimer(); quizActive = false; lockAnswers(); errors++;
        resultsLog.push({ scenario: ENGINE.scenarioTextQuiz(currentScenario), chosen: "Tempo scaduto", correct: ENGINE.labelForManeuver(currentScenario.correctAnswer), ok: false });
        renderStats();
        el.result.innerHTML = "<strong>Tempo scaduto.</strong><br>Corretta: " + ENGINE.labelForManeuver(currentScenario.correctAnswer) + "<br>" + currentScenario.reason;
        afterQuestion();
      }
    }, 1000);
  }
  function lockAnswers(){ [...el.answers.querySelectorAll("button")].forEach(b => b.disabled = true); }

  function renderDebug(details){
    if(!el.debugBox) return;
    const riskChecks = (details.riskDebug && details.riskDebug.checks || []).map(c => {
      const expected = Array.isArray(c.expected) ? c.expected.join(", ") : c.expected;
      return '<div class="debug-rule"><strong>' + c.field + '</strong>: attuale = ' + c.actual + ' · atteso = ' + expected + ' · esito = ' + (c.matched ? 'OK' : 'NO') + '</div>';
    }).join('');
    const riskBox = '<div class="item debug-card best"><strong>Contesto decisionale</strong><div class="debug-meta">Rischio: ' + ENGINE.labelForRiskLevel(details.riskLevel) + ' · Urgenza: ' + ENGINE.labelForUrgencyLevel(details.urgencyLevel) + '</div>' + (details.riskDebug && details.riskDebug.matchedRule ? '<div class="debug-rule"><strong>Regola rischio:</strong> ' + details.riskDebug.matchedRule.name + ' [' + details.riskDebug.matchedRule.id + ']</div>' : '<div class="debug-rule"><strong>Regola rischio:</strong> fallback MEDIO</div>') + riskChecks + (details.decisionContext && details.decisionContext.notes ? details.decisionContext.notes.map(function(n){ return '<div class="debug-rule">' + n + '</div>'; }).join('') : '') + '</div>';
    const maneuverBoxes = (details.debug || []).map(d => {
      const cls = d.sceltaFinale ? 'debug-card best' : (d.statoFinale === 'Consentita' ? 'debug-card ok' : 'debug-card no');
      const cons = d.consentitaDa.length ? d.consentitaDa.map(r => '<div class="debug-rule"><strong>Consentita da:</strong> ' + r.ruleName + ' [' + r.ruleId + ']<br><small>' + r.note + '</small></div>').join('') : '';
      const escl = d.esclusaDa.length ? d.esclusaDa.map(r => '<div class="debug-rule"><strong>Esclusa da:</strong> ' + r.ruleName + ' [' + r.ruleId + ']<br><small>' + r.note + '</small></div>').join('') : '';
      const over = d.override.length ? d.override.map(r => '<div class="debug-rule"><strong>Override:</strong> ' + r.note + '</div>').join('') : '';
      return '<div class="item ' + cls + '"><strong>' + d.label + '</strong><div class="debug-meta">Stato finale: ' + d.statoFinale + ' · Profilo: ' + ENGINE.labelForAudience(d.targetAudience) + '</div>' + (d.sceltaFinale ? '<div class="debug-rule"><strong>Scelta finale:</strong> ' + (d.motivoScelta || 'Selezionata dal motore.') + '</div>' : '') + cons + escl + over + '</div>';
    }).join('');
    el.debugBox.innerHTML = riskBox + maneuverBoxes;
    el.debugSection.classList.toggle("hidden", mode !== "INSTRUCTOR");
  }

  function renderInstructor(){
    const details = ENGINE.evaluateScenario(currentScenario);
    el.bestAnswerBox.innerHTML = "<strong>Risposta migliore:</strong> " + ENGINE.labelForManeuver(details.bestAnswer) + "<br><small>" + details.reason + "</small><br><small>Livello rischio (calcolato): " + ENGINE.labelForRiskLevel(details.riskLevel) + "</small>";
    el.allowedBox.innerHTML = details.allowed.map(i => `<div class="item ok"><strong>${ENGINE.labelForManeuver(i.answer)}</strong><br><small>${i.reason}</small></div>`).join("");
    el.forbiddenBox.innerHTML = details.forbidden.map(i => `<div class="item no"><strong>${ENGINE.labelForManeuver(i.answer)}</strong><br><small>${i.reason}</small></div>`).join("");
    renderDebug(details);
    el.instructorSection.classList.toggle("hidden", mode !== "INSTRUCTOR");
    el.quizSection.classList.toggle("hidden", mode !== "QUIZ");
  }

  function loadScenarioOnly(){
    const scenarios = ENGINE.getScenarios();
    currentScenario = scenarios[Math.floor(Math.random() * scenarios.length)] || null;
    if(!currentScenario){ el.scenarioCompact.textContent = "Nessuno scenario disponibile."; el.result.textContent = "Errore: archivio scenari vuoto."; return; }
    currentScenario = ENGINE.recalcScenario(currentScenario);
    el.scenarioCompact.textContent = ENGINE.scenarioTextQuiz(currentScenario);
    quizActive = false; stopTimer(); el.timerBadge.textContent = mode === "QUIZ" ? "--" : "OFF"; renderAnswers(); renderInstructor();
  }
  function resetSession(){ score = 0; questions = 0; errors = 0; resultsLog = []; quizFinished = false; sessionStarted = false; el.finalReportSection.classList.add("hidden"); renderStats(); }
  function beginQuestion(){
    if(!currentScenario) loadScenarioOnly();
    if(!currentScenario){ el.result.textContent = "Errore: nessuno scenario disponibile."; return; }
    quizActive = true; questions++; renderStats(); renderAnswers(); startTimerForScenario(); el.result.textContent = "Quiz in corso. Scegli la manovra corretta.";
  }
  function startQuiz(){
    if(mode !== "QUIZ") return;
    selectedTime = Number(el.timeSelect.value || 12); totalQuestionsTarget = Number(el.questionCountSelect.value || 10);
    if(quizFinished || !sessionStarted){ resetSession(); selectedTime = Number(el.timeSelect.value || 12); totalQuestionsTarget = Number(el.questionCountSelect.value || 10); loadScenarioOnly(); sessionStarted = true; beginQuestion(); return; }
    if(!quizActive) beginQuestion();
  }
  function nextQuestion(){
    if(mode !== "QUIZ"){ loadScenarioOnly(); el.result.textContent = "Scenario istruttore aggiornato."; return; }
    if(!sessionStarted){ el.result.textContent = 'Premi "Avvia quiz" per iniziare.'; return; }
    if(quizFinished){ el.result.textContent = "Quiz terminato. Premi Avvia quiz per ricominciare."; return; }
    if(questions >= totalQuestionsTarget){ finalizeQuiz(); return; }
    loadScenarioOnly(); beginQuestion();
  }
  function afterQuestion(){ if(questions >= totalQuestionsTarget) finalizeQuiz(); else el.result.innerHTML += "<br><br>Premi <strong>Prossima domanda</strong> per continuare."; }
  function finalizeQuiz(){
    quizFinished = true; quizActive = false; stopTimer(); el.timerBadge.textContent = "END"; lockAnswers();
    const correct = resultsLog.filter(x => x.ok), wrong = resultsLog.filter(x => !x.ok);
    el.finalSummary.innerHTML = `<strong>Quiz completato</strong><br>Domande totali: ${resultsLog.length}<br>Esatte: ${correct.length}<br>Errate: ${wrong.length}`;
    el.correctList.innerHTML = correct.length ? correct.map((r, i) => `<div class="item ok"><strong>#${i+1}</strong><br><small>${r.scenario}</small><br><strong>Data:</strong> ${r.chosen}</div>`).join("") : '<div class="item">Nessuna risposta esatta.</div>';
    el.wrongList.innerHTML = wrong.length ? wrong.map((r, i) => `<div class="item no"><strong>#${i+1}</strong><br><small>${r.scenario}</small><br><strong>Data:</strong> ${r.chosen}<br><strong>Corretta:</strong> ${r.correct}</div>`).join("") : '<div class="item">Nessuna risposta errata.</div>';
    el.finalReportSection.classList.remove("hidden"); el.result.textContent = "Quiz terminato. Consulta il resoconto finale.";
  }
  function handleAnswer(code, btn){
    if(!quizActive || !currentScenario || mode !== "QUIZ") return;
    quizActive = false; stopTimer(); lockAnswers();
    [...el.answers.querySelectorAll("button")].forEach(b => { if(b.dataset.answer === currentScenario.correctAnswer) b.classList.add("correct"); });
    const ok = code === currentScenario.correctAnswer;
    if(ok){ score++; el.result.innerHTML = "<strong>Corretto.</strong><br>" + currentScenario.reason; }
    else{ errors++; btn.classList.add("wrong"); el.result.innerHTML = "<strong>Errato.</strong><br>Corretta: " + ENGINE.labelForManeuver(currentScenario.correctAnswer) + "<br>" + currentScenario.reason; }
    resultsLog.push({ scenario: ENGINE.scenarioTextQuiz(currentScenario), chosen: ENGINE.labelForManeuver(code), correct: ENGINE.labelForManeuver(currentScenario.correctAnswer), ok });
    renderStats(); afterQuestion();
  }
  async function init(){
    Object.assign(el, { versionBadge:$("versionBadge"), startQuizBtn:$("startQuizBtn"), nextQuestionBtn:$("nextQuestionBtn"), newScenarioBtn:$("newScenarioBtn"), modeSelect:$("modeSelect"), audienceSelect:$("audienceSelect"), timeSelect:$("timeSelect"), questionCountSelect:$("questionCountSelect"), modeBadge:$("modeBadge"), questionBadge:$("questionBadge"), scenarioCompact:$("scenarioCompact"), answers:$("answers"), result:$("result"), scoreValue:$("scoreValue"), questionValue:$("questionValue"), errorsValue:$("errorsValue"), timerBadge:$("timerBadge"), instructorSection:$("instructorSection"), quizSection:$("quizSection"), bestAnswerBox:$("bestAnswerBox"), allowedBox:$("allowedBox"), forbiddenBox:$("forbiddenBox"), debugSection:$("debugSection"), debugBox:$("debugBox"), finalReportSection:$("finalReportSection"), finalSummary:$("finalSummary"), correctList:$("correctList"), wrongList:$("wrongList"), userBadge:$("userBadge"), loginBtn:$("loginBtn"), logoutBtn:$("logoutBtn"), adminLinkTop:$("adminLinkTop") });
    config = await CONFIG_STORE.loadConfig(); ENGINE.setConfig(config); AUTH.ensureUsers(); audience = (el.audienceSelect && el.audienceSelect.value) || 'ACCOMPAGNATORE'; ENGINE.setAudienceMode(audience); ENGINE.initializeScenarioArchive(); renderStats(); renderAnswers(); renderAuthUi(); bindAuthUi(); loadScenarioOnly();
    el.startQuizBtn.addEventListener("click", e => { e.preventDefault(); startQuiz(); });
    el.nextQuestionBtn.addEventListener("click", e => { e.preventDefault(); nextQuestion(); });
    el.newScenarioBtn.addEventListener("click", e => { e.preventDefault(); if(mode === "QUIZ" && sessionStarted && !quizFinished){ el.result.textContent = "Durante il quiz usa Prossima domanda."; return; } loadScenarioOnly(); });
    el.modeSelect.addEventListener("change", e => { mode = e.target.value; resetSession(); renderStats(); loadScenarioOnly(); });
    el.audienceSelect.addEventListener("change", e => { audience = e.target.value; ENGINE.setAudienceMode(audience); resetSession(); renderStats(); renderAnswers(); loadScenarioOnly(); });
    if("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
  }
  window.addEventListener("load", init);
})();