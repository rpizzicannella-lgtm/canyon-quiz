(function(){
  var selectedId = null;
  var draftConditions = [];
  var draftManeuvers = [];
  var draftPriority = [];

  function fieldOptions(){
    var opts = [
      { id:"situation", label:"Situazione", values: ADMIN_COMMON.config.situations.map(function(s){ return {id:s.id,label:s.label}; }) },
      { id:"risk_level", label:"Livello rischio", values:[{id:"BASSO",label:"Basso"},{id:"MEDIO",label:"Medio"},{id:"ALTO",label:"Alto"}] }
    ];
    ADMIN_COMMON.config.variables.forEach(function(v){
      opts.push({ id:v.id, label:v.label, values:v.values || [] });
    });
    return opts;
  }
  function fieldMeta(field){ return fieldOptions().find(function(f){ return f.id === field; }) || { id:field, label:field, values:[] }; }
  function fieldLabel(field){ return fieldMeta(field).label; }
  function valueLabel(field, val){
    var meta = fieldMeta(field);
    var item = (meta.values || []).find(function(v){ return v.id === val; });
    if(item) return item.label;
    var sit = (ADMIN_COMMON.config.situations || []).find(function(s){ return s.id === val; });
    return sit ? sit.label : val;
  }
  function valueLabelList(field, values){ return (Array.isArray(values) ? values : [values]).map(function(v){ return valueLabel(field, v); }).join(", "); }
  function opLabel(op){
    if(op === "eq") return "uguale a";
    if(op === "neq") return "diverso da";
    if(op === "in") return "uno tra";
    if(op === "not_in") return "non tra";
    return op;
  }
  function typeLabel(type){
    if(type === "allow") return "Consenti manovre";
    if(type === "exclude") return "Escludi manovre";
    if(type === "priority") return "Ordine di priorità";
    return type;
  }
  function maneuverLabel(id){
    var m = ADMIN_COMMON.config.maneuvers.find(function(x){ return x.id === id; });
    return m ? m.label : id;
  }
  function conditionNaturalText(c){
    var vals = Array.isArray(c.value) ? valueLabelList(c.field, c.value) : valueLabel(c.field, c.value);
    return fieldLabel(c.field) + " " + opLabel(c.op) + " " + vals;
  }
  function summarizeRule(r){
    var cond = (r.conditions || []).map(conditionNaturalText).join(", ");
    var payload = r.type === "priority" ? (r.priority || []).map(maneuverLabel).join(" > ") : (r.maneuvers || []).map(maneuverLabel).join(", ");
    return typeLabel(r.type) + " · " + cond + " · " + payload;
  }

  function listRender(){
    var list = document.getElementById("rulesList");
    list.innerHTML = "";
    ADMIN_COMMON.config.rules.forEach(function(item){
      var div = document.createElement("div");
      div.className = "item" + (selectedId === item.id ? " list-entry-active" : "");
      div.innerHTML = '<strong>'+item.name+'</strong><div class="mono">'+item.id+'</div><div class="subtle">'+summarizeRule(item)+'</div><div class="subtle">'+(item.note || '')+'</div>';
      div.onclick = function(){ selectedId = item.id; fillForm(item); listRender(); };
      list.appendChild(div);
    });
  }

  function renderConditions(){
    var box = document.getElementById("conditionsList");
    box.innerHTML = "";
    if(!draftConditions.length){
      box.innerHTML = '<div class="help-box">Nessuna condizione. Aggiungi una o più condizioni per definire quando la regola si applica.</div>';
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
      '</div><div class="subtle">Lettura naturale: ' + conditionNaturalText(cond) + '</div>';
      box.appendChild(row);

      var fieldSel = row.querySelector(".cond-field");
      fieldOptions().forEach(function(f){
        var o = document.createElement("option");
        o.value = f.id; o.textContent = f.label;
        if(cond.field === f.id) o.selected = true;
        fieldSel.appendChild(o);
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
        draftConditions.splice(Number(this.dataset.idx), 1);
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
        var o = document.createElement("option");
        o.value = v.id; o.textContent = v.label;
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
          if(this.checked){
            if(arr.indexOf(v.id) < 0) arr.push(v.id);
          } else {
            arr = arr.filter(function(x){ return x !== v.id; });
          }
          draftConditions[idx].value = arr;
          renderConditions();
        };
        label.appendChild(cb);
        var span = document.createElement("span");
        span.textContent = v.label;
        label.appendChild(span);
        box.appendChild(label);
      });
      wrap.appendChild(box);
    }
  }

  function renderPayloadBox(){
    var type = document.getElementById("ruleType").value;
    var box = document.getElementById("rulePayloadBox");
    box.innerHTML = "";
    if(type === "priority"){
      box.innerHTML = '<strong>Ordine di priorità</strong><div class="subtle">La prima manovra disponibile sarà preferita alle successive.</div><div id="priorityList" class="payload-list"></div><div class="payload-row"><select id="priorityAddSelect" class="text-input"></select><button type="button" id="addPriorityBtn">Aggiungi</button></div>';
      var sel = document.getElementById("priorityAddSelect");
      ADMIN_COMMON.config.maneuvers.forEach(function(m){
        var o = document.createElement("option");
        o.value = m.id; o.textContent = m.label;
        sel.appendChild(o);
      });
      document.getElementById("addPriorityBtn").onclick = function(){
        var id = sel.value;
        if(draftPriority.indexOf(id) < 0) draftPriority.push(id);
        renderPriorityList();
      };
      renderPriorityList();
    } else {
      var title = type === "allow" ? "Manovre consentite dalla regola" : "Manovre escluse dalla regola";
      box.innerHTML = '<strong>'+title+'</strong><div id="maneuverList" class="payload-list"></div><div class="payload-row"><select id="maneuverAddSelect" class="text-input"></select><button type="button" id="addManeuverBtn">Aggiungi</button></div>';
      var sel2 = document.getElementById("maneuverAddSelect");
      ADMIN_COMMON.config.maneuvers.forEach(function(m){
        var o2 = document.createElement("option");
        o2.value = m.id; o2.textContent = m.label;
        sel2.appendChild(o2);
      });
      document.getElementById("addManeuverBtn").onclick = function(){
        var id2 = sel2.value;
        if(draftManeuvers.indexOf(id2) < 0) draftManeuvers.push(id2);
        renderManeuverList();
      };
      renderManeuverList();
    }
  }

  function renderManeuverList(){
    var list = document.getElementById("maneuverList");
    if(!list) return;
    list.innerHTML = "";
    if(!draftManeuvers.length){
      list.innerHTML = '<div class="help-box">Nessuna manovra selezionata.</div>';
      return;
    }
    draftManeuvers.forEach(function(id, idx){
      var div = document.createElement("div");
      div.className = "payload-item";
      div.innerHTML = '<span>'+maneuverLabel(id)+'</span><button type="button" data-idx="'+idx+'" class="payload-delete">Rimuovi</button>';
      list.appendChild(div);
    });
    list.querySelectorAll(".payload-delete").forEach(function(btn){
      btn.onclick = function(){ draftManeuvers.splice(Number(this.dataset.idx),1); renderManeuverList(); };
    });
  }

  function renderPriorityList(){
    var list = document.getElementById("priorityList");
    if(!list) return;
    list.innerHTML = "";
    if(!draftPriority.length){
      list.innerHTML = '<div class="help-box">Nessuna manovra in priorità.</div>';
      return;
    }
    draftPriority.forEach(function(id, idx){
      var div = document.createElement("div");
      div.className = "payload-item";
      div.innerHTML = '<span>'+(idx+1)+'. '+maneuverLabel(id)+'</span><button type="button" data-dir="up" data-idx="'+idx+'" class="priority-move">↑</button><button type="button" data-dir="down" data-idx="'+idx+'" class="priority-move">↓</button><button type="button" data-idx="'+idx+'" class="priority-delete">Rimuovi</button>';
      list.appendChild(div);
    });
    list.querySelectorAll(".priority-delete").forEach(function(btn){
      btn.onclick = function(){ draftPriority.splice(Number(this.dataset.idx),1); renderPriorityList(); };
    });
    list.querySelectorAll(".priority-move").forEach(function(btn){
      btn.onclick = function(){
        var idx = Number(this.dataset.idx), dir = this.dataset.dir;
        var swap = dir === "up" ? idx - 1 : idx + 1;
        if(swap < 0 || swap >= draftPriority.length) return;
        var tmp = draftPriority[idx]; draftPriority[idx] = draftPriority[swap]; draftPriority[swap] = tmp;
        renderPriorityList();
      };
    });
  }

  function fillForm(item){
    draftConditions = JSON.parse(JSON.stringify(item.conditions || []));
    draftManeuvers = JSON.parse(JSON.stringify(item.maneuvers || []));
    draftPriority = JSON.parse(JSON.stringify(item.priority || []));
    document.getElementById("ruleId").value = item.id || "";
    document.getElementById("ruleName").value = item.name || "";
    document.getElementById("ruleType").value = item.type || "allow";
    document.getElementById("ruleEnabled").checked = !!item.enabled;
    document.getElementById("ruleNote").value = item.note || "";
    renderConditions();
    renderPayloadBox();
  }

  function readForm(){
    var type = document.getElementById("ruleType").value;
    var obj = {
      id: document.getElementById("ruleId").value.trim(),
      name: document.getElementById("ruleName").value.trim(),
      type: type,
      enabled: document.getElementById("ruleEnabled").checked,
      note: document.getElementById("ruleNote").value.trim(),
      conditions: JSON.parse(JSON.stringify(draftConditions))
    };
    if(type === "priority") obj.priority = JSON.parse(JSON.stringify(draftPriority));
    else obj.maneuvers = JSON.parse(JSON.stringify(draftManeuvers));
    return obj;
  }

  function bind(){
    document.getElementById("ruleType").onchange = function(){ renderPayloadBox(); };
    document.getElementById("addConditionBtn").onclick = function(){
      var first = fieldOptions()[0];
      draftConditions.push({ field:first ? first.id : "situation", op:"eq", value:"" });
      renderConditions();
    };
    document.getElementById("newRuleBtn").onclick = function(){ selectedId = null; fillForm({id:"",name:"",type:"allow",enabled:true,note:"",conditions:[],maneuvers:[],priority:[]}); listRender(); };
    document.getElementById("saveRuleBtn").onclick = function(){
      var obj = readForm();
      if(!obj.id || !obj.name || !obj.type) return alert("ID, nome e tipo obbligatori.");
      var idx = ADMIN_COMMON.config.rules.findIndex(function(x){ return x.id === selectedId; });
      if(idx >= 0) ADMIN_COMMON.config.rules[idx] = obj; else ADMIN_COMMON.config.rules.push(obj);
      selectedId = obj.id;
      ADMIN_COMMON.save("Regola salvata.");
      listRender();
    };
    document.getElementById("duplicateRuleBtn").onclick = function(){
      var obj = readForm();
      if(!obj.id || !obj.name) return;
      obj.id = obj.id + "_COPY";
      obj.name = obj.name + " copia";
      ADMIN_COMMON.config.rules.push(obj);
      selectedId = obj.id;
      fillForm(obj);
      ADMIN_COMMON.save("Regola duplicata.");
      listRender();
    };
    document.getElementById("deleteRuleBtn").onclick = function(){
      if(!selectedId) return;
      if(!confirm("Eliminare la regola selezionata?")) return;
      ADMIN_COMMON.config.rules = ADMIN_COMMON.config.rules.filter(function(x){ return x.id !== selectedId; });
      selectedId = null;
      fillForm({id:"",name:"",type:"allow",enabled:true,note:"",conditions:[],maneuvers:[],priority:[]});
      ADMIN_COMMON.save("Regola eliminata.");
      listRender();
    };
    document.getElementById("toggleRuleBtn").onclick = function(){
      if(!selectedId) return;
      var idx = ADMIN_COMMON.config.rules.findIndex(function(x){ return x.id === selectedId; });
      if(idx < 0) return;
      ADMIN_COMMON.config.rules[idx].enabled = !ADMIN_COMMON.config.rules[idx].enabled;
      fillForm(ADMIN_COMMON.config.rules[idx]);
      ADMIN_COMMON.save("Stato regola aggiornato.");
      listRender();
    };
  }

  async function init(){
    await ADMIN_COMMON.initBase();
    ADMIN_COMMON.requireAdmin(function(){
      bind();
      listRender();
      fillForm({id:"",name:"",type:"allow",enabled:true,note:"",conditions:[],maneuvers:[],priority:[]});
    });
  }
  window.addEventListener("load", init);
})();