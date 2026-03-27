(function(){
  let findings = [];
  function render(){
    const summary = document.getElementById("auditSummary");
    const list = document.getElementById("auditList");
    summary.innerHTML = findings.length ? ('<strong>Incoerenze trovate:</strong> ' + findings.length) : 'Nessuna incoerenza trovata dalle regole di audit.';
    list.innerHTML = findings.length ? findings.map(function(f){
      return '<div class="item no"><strong>Scenario #' + f.scenarioId + '</strong><div class="subtle">Regola audit: ' + (f.ruleName || f.ruleId || '-') + ' · Gravità: ' + (f.severity || 'MEDIA') + '</div><div class="subtle">Rischio: ' + ENGINE.labelForRiskLevel(f.riskLevel) + ' · Urgenza: ' + ENGINE.labelForUrgencyLevel(f.urgencyLevel) + '</div><pre class="scenario-compact">'+f.scenarioText+'</pre><div class="debug-rule"><strong>Problemi:</strong><br>' + f.problems.map(function(p){ return '• ' + p; }).join('<br>') + '</div><div class="debug-rule"><strong>Suggerimenti:</strong><br>' + f.suggestions.map(function(s){ return '• ' + s; }).join('<br>') + '</div></div>';
    }).join('') : '<div class="item ok">Nessun caso incoerente rilevato.</div>';
  }
  async function init(){
    await ADMIN_COMMON.initBase();
    ADMIN_COMMON.requireAdmin(function(){
      document.getElementById("runAuditBtn").onclick = function(){
        findings = ENGINE.auditScenarios();
        render();
        document.getElementById("result").textContent = "Audit completato.";
      };
      document.getElementById("exportAuditBtn").onclick = function(){
        const payload = { exported_at: new Date().toISOString(), version: APP_META.version, findings };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "canyon-audit-incoerenze.json";
        a.click();
      };
    });
  }
  window.addEventListener("load", init);
})();