(function(){
  var selectedId = null;
  function serializeValues(values){
    return (values || []).map(function(v){ return v.id + "|" + v.label; }).join("\n");
  }
  function parseValues(raw){
    return raw.split("\n").map(function(line){ return line.trim(); }).filter(Boolean).map(function(line){
      var parts = line.split("|");
      return { id:(parts[0] || "").trim(), label:(parts.slice(1).join("|") || parts[0] || "").trim() };
    }).filter(function(v){ return v.id && v.label; });
  }
  function listRender(){
    var list = document.getElementById("variablesList");
    list.innerHTML = "";
    ADMIN_COMMON.config.variables.forEach(function(item){
      var div = document.createElement("div");
      div.className = "item" + (selectedId === item.id ? " list-entry-active" : "");
      div.innerHTML = '<strong>'+item.label+'</strong><div class="mono">'+item.id+'</div><div class="subtle">'+(item.values || []).map(function(v){ return v.label; }).join(", ")+'</div>';
      div.onclick = function(){ selectedId = item.id; fillForm(item); listRender(); };
      list.appendChild(div);
    });
  }
  function fillForm(item){
    document.getElementById("variableId").value = item.id || "";
    document.getElementById("variableLabel").value = item.label || "";
    document.getElementById("variableValues").value = serializeValues(item.values || []);
  }
  function readForm(){
    return {
      id: document.getElementById("variableId").value.trim(),
      label: document.getElementById("variableLabel").value.trim(),
      values: parseValues(document.getElementById("variableValues").value)
    };
  }
  function bind(){
    document.getElementById("newVariableBtn").onclick = function(){
      selectedId = null; fillForm({id:"",label:"",values:[]}); listRender();
    };
    document.getElementById("saveVariableBtn").onclick = function(){
      var obj = readForm();
      if(!obj.id || !obj.label || !obj.values.length) return alert("ID, label e almeno un valore sono obbligatori.");
      var idx = ADMIN_COMMON.config.variables.findIndex(function(x){ return x.id === selectedId; });
      if(idx >= 0){
        var oldId = ADMIN_COMMON.config.variables[idx].id;
        ADMIN_COMMON.config.variables[idx] = obj;
        ADMIN_COMMON.config.rules.forEach(function(r){ (r.conditions || []).forEach(function(c){ if(c.field === oldId) c.field = obj.id; }); });
      } else {
        ADMIN_COMMON.config.variables.push(obj);
      }
      selectedId = obj.id;
      ADMIN_COMMON.save("Variabile salvata.");
      listRender();
    };
    document.getElementById("duplicateVariableBtn").onclick = function(){
      var obj = readForm();
      if(!obj.id || !obj.label || !obj.values.length) return;
      obj.id = obj.id + "_copy";
      obj.label = obj.label + " copia";
      ADMIN_COMMON.config.variables.push(obj);
      selectedId = obj.id;
      fillForm(obj);
      ADMIN_COMMON.save("Variabile duplicata.");
      listRender();
    };
    document.getElementById("deleteVariableBtn").onclick = function(){
      if(!selectedId) return;
      if(!confirm("Eliminare la variabile selezionata?")) return;
      ADMIN_COMMON.config.variables = ADMIN_COMMON.config.variables.filter(function(x){ return x.id !== selectedId; });
      selectedId = null;
      fillForm({id:"",label:"",values:[]});
      ADMIN_COMMON.save("Variabile eliminata.");
      listRender();
    };
  }
  async function init(){
    await ADMIN_COMMON.initBase();
    ADMIN_COMMON.requireAdmin(function(){ bind(); listRender(); fillForm({id:"",label:"",values:[]}); });
  }
  window.addEventListener("load", init);
})();