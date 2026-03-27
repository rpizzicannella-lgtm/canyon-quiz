(function(){
  var selectedId = null;
  function listRender(){
    var list = document.getElementById("usersList");
    list.innerHTML = "";
    AUTH.getConfiguredUsers().forEach(function(u){
      var div = document.createElement("div");
      div.className = "item" + (selectedId === u.id ? " list-entry-active" : "");
      div.innerHTML = "<strong>"+u.username+"</strong><div class='mono'>"+u.id+"</div><div class='subtle'>Ruolo: "+u.role+" · "+(u.enabled !== false ? "Attivo" : "Disattivo")+"</div>";
      div.onclick = function(){ selectedId = u.id; fillForm(u); listRender(); };
      list.appendChild(div);
    });
  }
  function fillForm(u){
    document.getElementById("userId").value = u.id || "";
    document.getElementById("username").value = u.username || "";
    document.getElementById("password").value = u.password || "";
    document.getElementById("role").value = u.role || "user";
    document.getElementById("enabled").checked = u.enabled !== false;
  }
  function readForm(){
    return {
      id: document.getElementById("userId").value.trim(),
      username: document.getElementById("username").value.trim(),
      password: document.getElementById("password").value,
      role: document.getElementById("role").value,
      enabled: document.getElementById("enabled").checked
    };
  }
  function saveUsers(message){
    var users = AUTH.getConfiguredUsers();
    AUTH.saveUsers(users);
    document.getElementById("result").textContent = message;
    listRender();
  }
  async function init(){
    await ADMIN_COMMON.initBase();
    ADMIN_COMMON.requireAdmin(function(){
      listRender();
      fillForm({id:"", username:"", password:"", role:"user", enabled:true});
      document.getElementById("newUserBtn").onclick = function(){
        selectedId = null;
        fillForm({id:"", username:"", password:"", role:"user", enabled:true});
        listRender();
      };
      document.getElementById("saveUserBtn").onclick = function(){
        var obj = readForm();
        if(!obj.id || !obj.username || !obj.password) return alert("ID, username e password obbligatori.");
        var users = AUTH.getConfiguredUsers();
        var idx = users.findIndex(function(x){ return x.id === selectedId; });
        if(idx >= 0) users[idx] = obj;
        else users.push(obj);
        AUTH.saveUsers(users);
        selectedId = obj.id;
        document.getElementById("result").textContent = "Utente salvato.";
        listRender();
      };
      document.getElementById("duplicateUserBtn").onclick = function(){
        var obj = readForm();
        if(!obj.id) return;
        obj.id = obj.id + "_COPY";
        obj.username = obj.username + "_copy";
        var users = AUTH.getConfiguredUsers();
        users.push(obj);
        AUTH.saveUsers(users);
        selectedId = obj.id;
        fillForm(obj);
        document.getElementById("result").textContent = "Utente duplicato.";
        listRender();
      };
      document.getElementById("deleteUserBtn").onclick = function(){
        if(!selectedId) return;
        if(!confirm("Eliminare l'utente selezionato?")) return;
        var users = AUTH.getConfiguredUsers().filter(function(x){ return x.id !== selectedId; });
        AUTH.saveUsers(users);
        selectedId = null;
        fillForm({id:"", username:"", password:"", role:"user", enabled:true});
        document.getElementById("result").textContent = "Utente eliminato.";
        listRender();
      };
    });
  }
  window.addEventListener("load", init);
})();