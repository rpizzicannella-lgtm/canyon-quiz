window.ADMIN_COMMON = {
  config: null,
  async initBase(){
    this.config = await CONFIG_STORE.loadConfig();
    ENGINE.setConfig(this.config);
    ENGINE.initializeScenarioArchive();
    AUTH.ensureUsers();
    const archive = document.getElementById("archiveCount");
    if(archive) archive.textContent = "Scenari: " + ENGINE.getScenarioCount();
  },
  save(message){
    CONFIG_STORE.saveConfig(this.config);
    const result = document.getElementById("result");
    if(result) result.textContent = message || "Salvato.";
    const archive = document.getElementById("archiveCount");
    if(archive) archive.textContent = "Scenari: " + ENGINE.getScenarioCount();
  },
  exportBundle(){
    const users = AUTH.getConfiguredUsers();
    const payload = { ...this.config, users, exportedAt: new Date().toISOString(), version: APP_META.version };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type:"application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "canyon-config-backup.json";
    a.click();
  },
  importBundle(fileInput, onLoaded){
    fileInput.onchange = async function(){
      const file = fileInput.files[0];
      if(!file) return;
      const text = await file.text();
      const bundle = JSON.parse(text);
      if(bundle.users) AUTH.saveUsers(bundle.users);
      onLoaded(bundle);
    };
    fileInput.click();
  },
  requireAdmin(callback){
    const pinGate = document.getElementById("pinGate");
    const adminApp = document.getElementById("adminApp");
    const pinMsg = document.getElementById("pinMsg");
    const user = AUTH.getUser();
    if(user && user.role === "admin"){
      if(pinGate) pinGate.classList.add("hidden");
      if(adminApp) adminApp.classList.remove("hidden");
      callback();
      return;
    }
    if(pinGate) pinGate.classList.remove("hidden");
    const usernameInput = document.getElementById("pinInput");
    if(usernameInput) usernameInput.placeholder = "Username";
    const pwd = document.createElement("input");
    pwd.type = "password";
    pwd.placeholder = "Password";
    pwd.className = "text-input";
    pwd.id = "adminPasswordInput";
    const wrap = pinGate.querySelector(".grid2");
    if(wrap && !document.getElementById("adminPasswordInput")) wrap.insertBefore(pwd, wrap.children[1]);
    document.getElementById("pinBtn").onclick = function(){
      const username = document.getElementById("pinInput").value.trim();
      const password = document.getElementById("adminPasswordInput").value;
      const res = AUTH.login(username, password);
      if(res.ok && AUTH.isAdmin()){
        if(pinGate) pinGate.classList.add("hidden");
        if(adminApp) adminApp.classList.remove("hidden");
        if(pinMsg) pinMsg.textContent = "";
        callback();
      } else {
        if(pinMsg) pinMsg.textContent = "Accesso admin non consentito.";
      }
    };
  }
};