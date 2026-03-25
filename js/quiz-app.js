(function(){
  let currentScenario = null, score = 0, questions = 0, errors = 0, timer = null, secondsLeft = 0, quizActive = false, mode = "QUIZ";
  const el = {};
  const $ = id => document.getElementById(id);
  function scenarioText(s){
    return `Situazione: ${LABELS.situation[s.situation]}
Calata: ${LABELS.calata[s.calata]}
Base: ${LABELS.base[s.base]}
Sfregamenti: ${s.sfregamenti ? "Sì" : "No"}
Corda annessa: ${s.cordaAnnessa ? "Sì" : "No"}
Vittima: ${LABELS.vittima[s.vittima]}
Compagni alla base: ${s.compagniBase ? "Sì" : "No"}
Caduta massi: ${s.cadutaMassi ? "Sì" : "No"}
Kit-bull in sosta: ${LABELS.cordaMagazzino[s.cordaMagazzino]}`;
  }
  function renderAnswers(){
    el.answers.innerHTML = "";
    CONFIG.answers.forEach(code => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "answer-btn";
      btn.textContent = LABELS.answers[code];
      btn.dataset.answer = code;
      btn.disabled = !quizActive || mode !== "QUIZ";
      btn.addEventListener("click", () => handleAnswer(code, btn));
      el.answers.appendChild(btn);
    });
  }
  function renderStats(){
    el.scoreValue.textContent = score;
    el.questionValue.textContent = questions;
    el.errorsValue.textContent = errors;
    el.questionBadge.textContent = "Q" + questions;
    el.modeBadge.textContent = mode === "QUIZ" ? "Quiz" : "Istruttore";
  }
  function stopTimer(){ if (timer) { clearInterval(timer); timer = null; } }
  function startTimerForScenario(s){
    stopTimer(); secondsLeft = CONFIG.timers[s.difficulty] || CONFIG.timers.DEFAULT; el.timerBadge.textContent = secondsLeft + "s";
    timer = setInterval(() => { secondsLeft--; el.timerBadge.textContent = secondsLeft + "s"; if (secondsLeft <= 0) { stopTimer(); quizActive = false; lockAnswers(); errors++; renderStats(); el.result.innerHTML = "<strong>Tempo scaduto.</strong><br>Corretta: " + LABELS.answers[currentScenario.correctAnswer] + "<br>" + currentScenario.reason; } }, 1000);
  }
  function lockAnswers(){ [...el.answers.querySelectorAll("button")].forEach(b => b.disabled = true); }
  function renderInstructor(){
    const details = RULES.evaluateAll(currentScenario);
    el.bestAnswerBox.innerHTML = "<strong>Risposta migliore:</strong> " + LABELS.answers[details.bestAnswer] + "<br><small>" + RULES.explain(details.bestAnswer) + "</small>";
    el.allowedBox.innerHTML = details.allowed.map(i => `<div class="item ok"><strong>${LABELS.answers[i.answer]}</strong><br><small>${i.reason}</small></div>`).join("");
    el.forbiddenBox.innerHTML = details.forbidden.map(i => `<div class="item no"><strong>${LABELS.answers[i.answer]}</strong><br><small>${i.reason}</small></div>`).join("");
    el.instructorSection.classList.toggle("hidden", mode !== "INSTRUCTOR");
    el.quizSection.classList.toggle("hidden", mode !== "QUIZ");
  }
  function loadScenarioOnly(){
    currentScenario = SCENARIOS.getRandomScenario(); if (!currentScenario) { el.scenarioCompact.textContent = "Nessuno scenario disponibile."; return; }
    el.scenarioCompact.textContent = scenarioText(currentScenario); el.result.textContent = mode === "QUIZ" ? 'Scenario caricato. Premi "Avvia quiz" per rispondere.' : "Analisi istruttore pronta."; quizActive = false; stopTimer(); el.timerBadge.textContent = mode === "QUIZ" ? "--" : "OFF"; renderAnswers(); renderInstructor();
  }
  function startQuiz(){ if (mode !== "QUIZ") return; if (!currentScenario) loadScenarioOnly(); if (quizActive) return; quizActive = true; questions++; renderStats(); renderAnswers(); startTimerForScenario(currentScenario); el.result.textContent = "Quiz avviato. Scegli la manovra corretta."; }
  function nextQuestion(){ quizActive = false; stopTimer(); el.timerBadge.textContent = mode === "QUIZ" ? "--" : "OFF"; loadScenarioOnly(); }
  function handleAnswer(code, btn){
    if (!quizActive || !currentScenario || mode !== "QUIZ") return;
    quizActive = false; stopTimer(); lockAnswers(); [...el.answers.querySelectorAll("button")].forEach(b => { if (b.dataset.answer === currentScenario.correctAnswer) b.classList.add("correct"); });
    if (code === currentScenario.correctAnswer) { score++; el.result.innerHTML = "<strong>Corretto.</strong><br>" + currentScenario.reason; }
    else { errors++; btn.classList.add("wrong"); el.result.innerHTML = "<strong>Errato.</strong><br>Corretta: " + LABELS.answers[currentScenario.correctAnswer] + "<br>" + currentScenario.reason; }
    renderStats();
  }
  async function init(){
    Object.assign(el, { startQuizBtn: $("startQuizBtn"), nextQuestionBtn: $("nextQuestionBtn"), newScenarioBtn: $("newScenarioBtn"), modeSelect: $("modeSelect"), modeBadge: $("modeBadge"), questionBadge: $("questionBadge"), scenarioCompact: $("scenarioCompact"), answers: $("answers"), result: $("result"), scoreValue: $("scoreValue"), questionValue: $("questionValue"), errorsValue: $("errorsValue"), timerBadge: $("timerBadge"), instructorSection: $("instructorSection"), quizSection: $("quizSection"), bestAnswerBox: $("bestAnswerBox"), allowedBox: $("allowedBox"), forbiddenBox: $("forbiddenBox") });
    await SCENARIOS.initScenarioStore(); renderStats(); renderAnswers(); loadScenarioOnly();
    el.startQuizBtn.addEventListener("click", e => { e.preventDefault(); startQuiz(); });
    el.nextQuestionBtn.addEventListener("click", e => { e.preventDefault(); nextQuestion(); });
    el.newScenarioBtn.addEventListener("click", e => { e.preventDefault(); loadScenarioOnly(); });
    el.modeSelect.addEventListener("change", e => { mode = e.target.value; renderStats(); nextQuestion(); });
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("./sw.js");
  }
  window.addEventListener("load", init);
})();