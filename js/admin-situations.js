(function(){
  var selectedId = null;
  function listRender(){
    var list = document.getElementById("situationsList");
    list.innerHTML = "";
    ADMIN_COMMON.config.situations.forEach(function(item){
      var div = document.createElement("div");
      div.className = "item" + (selectedId === item.id ? " list-entry-active" : "");
      div.innerHTML = '<strong>'+item.label+'</strong><div class="mono">'+item.id+'</div><div class="subtle">'+(item.description || '')+'</div>';
      div.onclick = function(){ selectedId = item.id; fillForm(item); listRender(); };
      list.appendChild(div);
    });
  }
  function fillForm(item){
    document.getElementById("situationId").value = item.id || "";
    document.getElementById("situationLabel").value = item.label || "";
    document.getElementById("situationDescription").value = item.description || "";
  }
  function readForm(){
    return {
      id: document.getElementById("situationId").value.trim(),
      label: document.getElementById("situationLabel").value.trim(),
      description: document.getElementById("situationDescription").value.trim()
    };
  }
  function bind(){
    document.getElementById("newSituationBtn").onclick = function(){
      selectedId = null;
      fillForm({id:"",label:"",description:""});
      listRender();
    };
    document.getElementById("saveSituationBtn").onclick = function(){
      var obj = readForm();
      if(!obj.id || !obj.label) return alert("ID e label obbligatori.");
      var idx = ADMIN_COMMON.config.situations.findIndex(function(x){ return x.id === selectedId; });
      if(idx >= 0){
        var oldId = ADMIN_COMMON.config.situations[idx].id;
        ADMIN_COMMON.config.situations[idx] = obj;
        ADMIN_COMMON.config.rules.forEach(function(r){
          (r.conditions || []).forEach(function(c){
            if(c.field === "situation"){
              if(c.value === oldId) c.value = obj.id;
              if(Array.isArray(c.value)) c.value = c.value.map(function(v){ return v === oldId ? obj.id : v; });
            }
          });
        });
      } else {
        ADMIN_COMMON.config.situations.push(obj);
      }
      selectedId = obj.id;
      ADMIN_COMMON.save("Situazione salvata.");
      listRender();
    };
    document.getElementById("duplicateSituationBtn").onclick = function(){
      var obj = readForm();
      if(!obj.id || !obj.label) return;
      obj.id = obj.id + "_COPY";
      obj.label = obj.label + " copia";
      ADMIN_COMMON.config.situations.push(obj);
      selectedId = obj.id;
      fillForm(obj);
      ADMIN_COMMON.save("Situazione duplicata.");
      listRender();
    };
    document.getElementById("deleteSituationBtn").onclick = function(){
      if(!selectedId) return;
      if(!confirm("Eliminare la situazione selezionata?")) return;
      ADMIN_COMMON.config.situations = ADMIN_COMMON.config.situations.filter(function(x){ return x.id !== selectedId; });
      selectedId = null;
      fillForm({id:"",label:"",description:""});
      ADMIN_COMMON.save("Situazione eliminata.");
      listRender();
    };
  }
  async function init(){
    await ADMIN_COMMON.initBase();
    ADMIN_COMMON.requireAdmin(function(){ bind(); listRender(); fillForm({id:"",label:"",description:""}); });
  }
  window.addEventListener("load", init);
})();