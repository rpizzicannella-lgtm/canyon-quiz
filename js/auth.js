(function(){
  const USER_STORAGE_KEY = "canyon_auth_user_v36";
  const USERS_STORAGE_KEY = "canyon_users_v36";

  function getConfiguredUsers(){
    const local = localStorage.getItem(USERS_STORAGE_KEY);
    if(local){
      try { return JSON.parse(local); } catch(e){}
    }
    return JSON.parse(JSON.stringify((window.DEFAULT_CONFIG && window.DEFAULT_CONFIG.users) || []));
  }

  function saveUsers(users){
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
  }

  function ensureUsers(){
    const users = getConfiguredUsers();
    if(!localStorage.getItem(USERS_STORAGE_KEY)) saveUsers(users);
    return users;
  }

  function getUser(){
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    if(!raw) return null;
    try { return JSON.parse(raw); } catch(e){ return null; }
  }

  function setUser(user){
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
  }

  function clearUser(){
    localStorage.removeItem(USER_STORAGE_KEY);
  }

  function login(username, password){
    const users = ensureUsers();
    const found = users.find(u => u.enabled !== false && u.username === username && u.password === password);
    if(!found) return { ok:false, message:"Credenziali non valide." };
    const safe = { id: found.id, username: found.username, role: found.role };
    setUser(safe);
    return { ok:true, user:safe };
  }

  function logout(){ clearUser(); }
  function isAdmin(){ const u = getUser(); return !!u && u.role === "admin"; }
  function isAuthenticated(){ return !!getUser(); }

  function requireAuth(role){
    const user = getUser();
    if(!user) return false;
    if(role === "admin") return user.role === "admin";
    return true;
  }

  window.AUTH = {
    USER_STORAGE_KEY, USERS_STORAGE_KEY,
    getConfiguredUsers, saveUsers, ensureUsers,
    getUser, setUser, clearUser,
    login, logout, isAdmin, isAuthenticated, requireAuth
  };
})();