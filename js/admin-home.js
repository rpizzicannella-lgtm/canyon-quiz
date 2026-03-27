(function(){
  async function init(){
    await ADMIN_COMMON.initBase();
    ADMIN_COMMON.requireAdmin(function(){ renderHome(); bind(); });
  }

  function bind(){
    document.getElementById("addMissingBtn").addEventListener("click", function(){
      const added = ENGINE.addMissingScenarios();
      ADMIN_COMMON.save("Aggiunti " + added + " scenari mancanti.");
      renderHome();
    });

    document.getElementById("regenerateBtn").addEventListener("click", async function(){
      const proceed = confirm("⚠️ ATTENZIONE\n\nStai per rigenerare completamente tutti gli scenari.\nQuesta operazione:\n- ricrea l'archivio scenari\n- può invalidare override esistenti\n- può cambiare gli ID se hai già una base dati diversa\n\nSi consiglia di esportare prima la configurazione.\n\nVuoi continuare?");
      if(!proceed) return;

      const wantsExport = confirm("💾 CONSIGLIATO\n\nVuoi esportare la configurazione attuale prima di procedere?");
      if(wantsExport){
        ADMIN_COMMON.exportBundle();
      }

      const typed = prompt("Per confermare digita esattamente: RIGENERA");
      if(typed !== "RIGENERA"){
        document.getElementById("result").textContent = "Rigenerazione annullata.";
        return;
      }

      ENGINE.regenerateAllScenarios();
      renderHome();
      document.getElementById("result").textContent = "Archivio scenari rigenerato completamente.";
    });

    document.getElementById("exportBundleBtn").addEventListener("click", function(){ ADMIN_COMMON.exportBundle(); });
    document.getElementById("importBundleBtn").addEventListener("click", function(){
      ADMIN_COMMON.importBundle(document.getElementById("fileInput"), function(bundle){
        ADMIN_COMMON.config = bundle;
        ADMIN_COMMON.save("Configurazione importata.");
        renderHome();
      });
    });
    document.getElementById("resetLocalBtn").addEventListener("click", async function(){
      CONFIG_STORE.clearLocalConfig();
      CONFIG_STORE.clearScenarioArchive();
      localStorage.removeItem(AUTH.USERS_STORAGE_KEY);
      AUTH.clearUser();
      ADMIN_COMMON.config = await CONFIG_STORE.loadDefaultConfig();
      ENGINE.setConfig(ADMIN_COMMON.config);
      ENGINE.initializeScenarioArchive();
      ADMIN_COMMON.save("Configurazione locale e archivio scenari azzerati.");
      renderHome();
    });
  }

  function renderHome(){
    var cfg = ADMIN_COMMON.config;
    var box = document.getElementById("summaryBox");
    box.innerHTML = [
      '<div class="item"><strong>Scenari:</strong> '+ENGINE.getScenarioCount()+'</div>',
      '<div class="item"><strong>Situazioni:</strong> '+cfg.situations.length+'</div>',
      '<div class="item"><strong>Variabili scenario:</strong> '+cfg.variables.length+'</div>',
      '<div class="item"><strong>Manovre:</strong> '+cfg.maneuvers.length+'</div>',
      '<div class="item"><strong>Regole globali:</strong> '+cfg.rules.length+'</div>',
      '<div class="item"><strong>Override scenario:</strong> '+Object.keys(cfg.scenarioOverrides || {}).length+'</div>',
      '<div class="item"><strong>Dettagli manovre:</strong> '+Object.keys(cfg.detailOverrides || {}).length+'</div>', '<div class="item"><strong>Utenti:</strong> '+AUTH.getConfiguredUsers().length+'</div>'
    ].join('');
    var archive = document.getElementById("archiveCount");
    if(archive) archive.textContent = "Scenari: " + ENGINE.getScenarioCount();
  }

  window.addEventListener("load", init);
})();