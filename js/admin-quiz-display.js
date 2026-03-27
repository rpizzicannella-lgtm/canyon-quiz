(function(){
  let rows = [];

  function normalizeState(){
    const cfg = ADMIN_COMMON.config;
    cfg.quizDisplay = cfg.quizDisplay || { showScenarioId:true, showSituation:true, visibleFields:[] };
    const saved = Array.isArray(cfg.quizDisplay.visibleFields) ? cfg.quizDisplay.visibleFields.slice() : [];
    const allIds = (cfg.variables || []).map(v => v.id);
    const ordered = saved.filter(id => allIds.includes(id)).concat(allIds.filter(id => !saved.includes(id)));
    rows = ordered.map(id => ({ id, visible: saved.length ? saved.includes(id) : true }));
  }

  function swapRows(a, b){
    const tmp = rows[a];
    rows[a] = rows[b];
    rows[b] = tmp;
  }

  function currentQuizDisplay(){
    return {
      showScenarioId: document.getElementById("showScenarioId").checked,
      showSituation: document.getElementById("showSituation").checked,
      visibleFields: rows.filter(r => r.visible).map(r => r.id)
    };
  }

  function renderRows(){
    const list = document.getElementById("fieldsList");
    list.innerHTML = "";
    rows.forEach((row, idx) => {
      const variable = ADMIN_COMMON.config.variables.find(v => v.id === row.id);
      const div = document.createElement("div");
      div.className = "item";
      div.innerHTML = '<div class="condition-row">' +
        '<label><input type="checkbox" class="field-visible" data-idx="'+idx+'" '+(row.visible ? 'checked' : '')+'> Mostra</label>' +
        '<div><strong>' + (variable ? variable.label : row.id) + '</strong><div class="mono">' + row.id + '</div></div>' +
        '<button type="button" class="move-up" data-idx="'+idx+'">↑</button>' +
        '<button type="button" class="move-down" data-idx="'+idx+'">↓</button>' +
      '</div>';
      list.appendChild(div);
    });

    list.querySelectorAll(".field-visible").forEach(el => {
      el.onchange = function(){
        rows[Number(this.dataset.idx)].visible = this.checked;
        renderPreview();
      };
    });
    list.querySelectorAll(".move-up").forEach(el => {
      el.onclick = function(){
        const idx = Number(this.dataset.idx);
        if(idx <= 0) return;
        swapRows(idx, idx - 1);
        renderRows();
        renderPreview();
      };
    });
    list.querySelectorAll(".move-down").forEach(el => {
      el.onclick = function(){
        const idx = Number(this.dataset.idx);
        if(idx >= rows.length - 1) return;
        swapRows(idx, idx + 1);
        renderRows();
        renderPreview();
      };
    });
  }

  function previewScenario(){
    const scenarios = ENGINE.getScenarios();
    if(!scenarios || !scenarios.length) return null;
    const visible = currentQuizDisplay().visibleFields;
    if(visible.includes("compagni_base")) {
      const withComp = scenarios.find(s => s.compagni_base);
      if(withComp) return withComp;
    }
    return scenarios[0];
  }

  function renderPreview(){
    const cfg = ADMIN_COMMON.config;
    cfg.quizDisplay = currentQuizDisplay();
    ENGINE.setConfig(cfg);
    const sample = previewScenario();
    document.getElementById("previewBox").textContent = sample ? ENGINE.scenarioTextQuiz(sample) : "Nessuno scenario disponibile.";
  }

  async function init(){
    await ADMIN_COMMON.initBase();
    ADMIN_COMMON.requireAdmin(function(){
      normalizeState();
      document.getElementById("showScenarioId").checked = ADMIN_COMMON.config.quizDisplay?.showScenarioId !== false;
      document.getElementById("showSituation").checked = ADMIN_COMMON.config.quizDisplay?.showSituation !== false;
      document.getElementById("showScenarioId").onchange = renderPreview;
      document.getElementById("showSituation").onchange = renderPreview;
      renderRows();
      renderPreview();

      document.getElementById("saveQuizDisplayBtn").onclick = function(){
        ADMIN_COMMON.config.quizDisplay = currentQuizDisplay();
        CONFIG_STORE.saveConfig(ADMIN_COMMON.config);
        ENGINE.setConfig(ADMIN_COMMON.config);
        document.getElementById("result").textContent = "Configurazione visualizzazione quiz salvata.";
        renderPreview();
      };
    });
  }
  window.addEventListener("load", init);
})();