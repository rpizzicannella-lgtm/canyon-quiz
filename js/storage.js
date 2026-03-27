(function(){
  const CONFIG_STORAGE_KEY = "canyon_dynamic_config_v17";
  const SCENARIO_ARCHIVE_KEY = "canyon_scenario_archive_v28";

  async function loadDefaultConfig(){
    try {
      if (window.location.protocol === "file:" && window.DEFAULT_CONFIG) {
        return JSON.parse(JSON.stringify(window.DEFAULT_CONFIG));
      }
      const res = await fetch("./data/default-config.json");
      if (!res.ok) throw new Error("fetch failed");
      return await res.json();
    } catch (e) {
      if (window.DEFAULT_CONFIG) return JSON.parse(JSON.stringify(window.DEFAULT_CONFIG));
      throw e;
    }
  }

  async function loadConfig(){
    const local = localStorage.getItem(CONFIG_STORAGE_KEY);
    if(local){
      try { return JSON.parse(local); } catch(e){}
    }
    return await loadDefaultConfig();
  }

  function saveConfig(config){
    localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(config));
  }

  function clearLocalConfig(){
    localStorage.removeItem(CONFIG_STORAGE_KEY);
  }

  function loadScenarioArchive(){
    const raw = localStorage.getItem(SCENARIO_ARCHIVE_KEY);
    if(!raw) return null;
    try { return JSON.parse(raw); } catch(e){ return null; }
  }

  function saveScenarioArchive(archive){
    localStorage.setItem(SCENARIO_ARCHIVE_KEY, JSON.stringify(archive));
  }

  function clearScenarioArchive(){
    localStorage.removeItem(SCENARIO_ARCHIVE_KEY);
  }

  window.CONFIG_STORE = {
    loadDefaultConfig, loadConfig, saveConfig, clearLocalConfig,
    loadScenarioArchive, saveScenarioArchive, clearScenarioArchive,
    CONFIG_STORAGE_KEY, SCENARIO_ARCHIVE_KEY
  };
})();