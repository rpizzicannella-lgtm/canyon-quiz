(function(){
  async function loadAllFromSupabase(_config){
    throw new Error("Supabase non attivo in questa build. Struttura pronta per attivazione successiva.");
  }
  async function saveAllToSupabase(_config, _bundle){
    throw new Error("Supabase non attivo in questa build. Struttura pronta per attivazione successiva.");
  }
  window.SUPABASE_ADAPTER = { loadAllFromSupabase, saveAllToSupabase };
})();