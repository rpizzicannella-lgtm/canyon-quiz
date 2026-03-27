(function(){
  var selectedId = null;
  var draftConditions = [];

  function fieldOptions(){
    return (ADMIN_COMMON.config.variables || []).map(function(v){
      return { id:v.id, label:v.label, values:v.values || [] };
    });
  }
  function fieldMeta(id){
    return fieldOptions().find(function(x){ return x.id === id; }) || { id:id, label:id, values:[] };
  }
  function valueLabel(field, val){
    var meta = fieldMeta(field);
    var item = (meta.values || []).find(function(v){ return v.id === val; });
    return item ? item.label : val;
  }
  function opLabel(op){
    if(op === "eq") return "uguale a";
    if(op === "neq") return "diverso da";
    if(op === "in") return "uno tra";
    if(op === "not_in") return "non tra";
    return op;
  }
  function condText(c){
    var val = Array.isArray(c.value) ? c.value.map(function(v){ return valueLabel(c.field, v); }).join(", ") : valueLabel(c.field, c.value);
    return fieldMeta(c.field).label + " " + opLabel(c.op) + " " + val;
  }
  function listRender(){
    var list = document.getElementById("riskRulesList");
    list.innerHTML = "";
    (ADMIN_COMMON.config.riskRules || []).forEach(function(r){
      var div = document.createElement("div");
      div.className = "item" + (selectedId === r.id ? " list-entry-active" : "");
      div.innerHTML = '<strong>'+r.name+'</strong><div class="mono">'+r.id+'</div><div class="subtle">Livello: '+r.level+'</div><div class="subtle">'+(r.conditions || []).map(condText).join(", ")+'</div>';
      div.onclick = function(){ selectedId = r.id; fillForm(r); listRender(); };
      list.appendChild(div);
    });
  }
  function renderConditions(){
    var box = document.getElementById("riskConditionsList");
    box.innerHTML = "";
    if(!draftConditions.length){
      box.innerHTML = '<div class="help-box">Nessuna condizione. Aggiungi una o più condizioni.</div>';
      return;
    }
    draftConditions.forEach(function(cond, idx){
      var row = document.createElement("div");
      row.className = "item";
      row.innerHTML = '<div class="condition-row">' +
        '<label class="stacked">Campo<select class="cond-field" data-idx="'+idx+'"></select></label>' +
        '<label class="stacked">Condizione<select class="cond-op" data-idx="'+idx+'"><option value="eq">uguale a</option><option value="neq">diverso da</option><option value="in">uno tra</option><option value="not_in">non tra</option></select></label>' +
        '<div class="stacked"><label>Valore/i</label><div class="cond-value-box" data-idx="'+idx+'"></div></div>' +
        '<button type="button" class="cond-delete" data-idx="'+idx+'">Elimina</button>' +
        '</div><div class="subtle">Lettura naturale: ' + condText(cond) + '</div>';
      box.appendChild(row);

      var sel = row.querySelector(".cond-field");
      fieldOptions().forEach(function(f){
        var o = document.createElement("option"); o.value = f.id; o.textContent = f.label;
        if(cond.field === f.id) o.selected = true;
        sel.appendChild(o);
      });
      row.querySelector(".cond-op").value = cond.op;
      renderConditionValueControl(idx);
    });

    box.querySelectorAll(".cond-field").forEach(function(el){
      el.onchange = function(){
        var idx = Number(this.dataset.idx);
        draftConditions[idx].field = this.value;
        draftConditions[idx].value = "";
        renderConditions();
      };
    });
    box.querySelectorAll(".cond-op").forEach(function(el){
      el.onchange = function(){
        var idx = Number(this.dataset.idx);
        draftConditions[idx].op = this.value;
        draftConditions[idx].value = (this.value === "in" || this.value === "not_in") ? [] : "";
        renderConditions();
      };
    });
    box.querySelectorAll(".cond-delete").forEach(function(el){
      el.onclick = function(){
        draftConditions.splice(Number(this.dataset.idx),1);
        renderConditions();
      };
    });
  }
  function renderConditionValueControl(idx){
    var cond = draftConditions[idx];
    var meta = fieldMeta(cond.field);
    var wrap = document.querySelector('.cond-value-box[data-idx="'+idx+'"]');
    if(!wrap) return;
    wrap.innerHTML = "";
    if(cond.op === "eq" || cond.op === "neq"){
      var select = document.createElement("select");
      select.className = "text-input";
      var empty = document.createElement("option");
      empty.value = ""; empty.textContent = "-- seleziona --";
      select.appendChild(empty);
      (meta.values || []).forEach(function(v){
        var o = document.createElement("option"); o.value = v.id; o.textContent = v.label;
        if(cond.value === v.id) o.selected = true;
        select.appendChild(o);
      });
      select.onchange = function(){ draftConditions[idx].value = this.value; renderConditions(); };
      wrap.appendChild(select);
    } else {
      var current = Array.isArray(cond.value) ? cond.value : [];
      var box = document.createElement("div");
      box.className = "choice-box";
      (meta.values || []).forEach(function(v){
        var label = document.createElement("label");
        label.className = "choice-item";
        var cb = document.createElement("input");
        cb.type = "checkbox";
        cb.checked = current.indexOf(v.id) >= 0;
        cb.onchange = function(){
          var arr = Array.isArray(draftConditions[idx].value) ? draftConditions[idx].value.slice() : [];
          if(this.checked){ if(arr.indexOf(v.id) < 0) arr.push(v.id); }
          else arr = arr.filter(function(x){ return x !== v.id; });
          draftConditions[idx].value = arr;
          renderConditions();
        };
        label.appendChild(cb);
        var span = document.createElement("span"); span.textContent = v.label;
        label.appendChild(span);
        box.appendChild(label);
      });
      wrap.appendChild(box);
    }
  }
  function fillForm(r){
    draftConditions = JSON.parse(JSON.stringify(r.conditions || []));
    document.getElementById("riskRuleId").value = r.id || "";
    document.getElementById("riskRuleName").value = r.name || "";
    document.getElementById("riskRuleLevel").value = r.level || "MEDIO";
    renderConditions();
  }
  function readForm(){
    return {
      id: document.getElementById("riskRuleId").value.trim(),
      name: document.getElementById("riskRuleName").value.trim(),
      level: document.getElementById("riskRuleLevel").value,
      conditions: JSON.parse(JSON.stringify(draftConditions))
    };
  }
  function bind(){
    document.getElementById("addRiskConditionBtn").onclick = function(){
      var first = fieldOptions()[0];
      draftConditions.push({ field:first ? first.id : "", op:"eq", value:"" });
      renderConditions();
    };
    document.getElementById("newRiskRuleBtn").onclick = function(){
      selectedId = null; fillForm({id:"",name:"",level:"MEDIO",conditions:[]}); listRender();
    };
    document.getElementById("saveRiskRuleBtn").onclick = function(){
      var obj = readForm();
      if(!obj.id || !obj.name) return alert("ID e nome obbligatori.");
      ADMIN_COMMON.config.riskRules = ADMIN_COMMON.config.riskRules || [];
      var idx = ADMIN_COMMON.config.riskRules.findIndex(function(x){ return x.id === selectedId; });
      if(idx >= 0) ADMIN_COMMON.config.riskRules[idx] = obj;
      else ADMIN_COMMON.config.riskRules.push(obj);
      selectedId = obj.id;
      ADMIN_COMMON.save("Regola rischio salvata.");
      listRender();
    };
    document.getElementById("duplicateRiskRuleBtn").onclick = function(){
      var obj = readForm();
      if(!obj.id || !obj.name) return;
      obj.id = obj.id + "_COPY";
      obj.name = obj.name + " copia";
      ADMIN_COMMON.config.riskRules.push(obj);
      selectedId = obj.id;
      fillForm(obj);
      ADMIN_COMMON.save("Regola rischio duplicata.");
      listRender();
    };
    document.getElementById("deleteRiskRuleBtn").onclick = function(){
      if(!selectedId) return;
      if(!confirm("Eliminare la regola rischio selezionata?")) return;
      ADMIN_COMMON.config.riskRules = (ADMIN_COMMON.config.riskRules || []).filter(function(x){ return x.id !== selectedId; });
      selectedId = null;
      fillForm({id:"",name:"",level:"MEDIO",conditions:[]});
      ADMIN_COMMON.save("Regola rischio eliminata.");
      listRender();
    };
    document.getElementById("moveRiskUpBtn").onclick = function(){
      var arr = ADMIN_COMMON.config.riskRules || [];
      var idx = arr.findIndex(function(x){ return x.id === selectedId; });
      if(idx <= 0) return;
      var tmp = arr[idx-1]; arr[idx-1] = arr[idx]; arr[idx] = tmp;
      ADMIN_COMMON.save("Ordine regole rischio aggiornato.");
      listRender();
    };
    document.getElementById("moveRiskDownBtn").onclick = function(){
      var arr = ADMIN_COMMON.config.riskRules || [];
      var idx = arr.findIndex(function(x){ return x.id === selectedId; });
      if(idx < 0 || idx >= arr.length - 1) return;
      var tmp = arr[idx+1]; arr[idx+1] = arr[idx]; arr[idx] = tmp;
      ADMIN_COMMON.save("Ordine regole rischio aggiornato.");
      listRender();
    };
  }
  async function init(){
    await ADMIN_COMMON.initBase();
    ADMIN_COMMON.requireAdmin(function(){
      ADMIN_COMMON.config.riskRules = ADMIN_COMMON.config.riskRules || [];
      bind();
      listRender();
      fillForm({id:"",name:"",level:"MEDIO",conditions:[]});
    });
  }
  window.addEventListener("load", init);
})();