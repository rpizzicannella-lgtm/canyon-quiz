(function(){
  var selectedId = null;

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
  function valueLabel(field, val){
    var meta = fieldMeta(field);
    var item = (meta.values || []).find(function(v){ return v.id === val; });
    if(item) return item.label;
    var sit = (ADMIN_COMMON.config.situations || []).find(function(s){ return s.id === val; });
    return sit ? sit.label : val;
  }
  function opLabel(op){
    if(op === "eq") return "uguale a";
    if(op === "neq") return "diverso da";
    if(op === "in") return "uno tra";
    if(op === "not_in") return "non tra";
    return op;
  }
  function summarizeRule(r){
    var cond = (r.conditions || []).map(function(c){
      var vals = Array.isArray(c.value) ? c.value.map(function(v){ return valueLabel(c.field, v); }).join(", ") : valueLabel(c.field, c.value);
      return fieldMeta(c.field).label + " " + opLabel(c.op) + " " + vals;
    }).join(", ");
    var payload = r.type === "priority"
      ? "Ordine: " + (r.priority || []).map(function(id){
          var m = ADMIN_COMMON.config.maneuvers.find(function(x){ return x.id === id; });
          return m ? m.label : id;
        }).join(" > ")
      : "Manovre: " + (r.maneuvers || []).map(function(id){
          var m = ADMIN_COMMON.config.maneuvers.find(function(x){ return x.id === id; });
          return m ? m.label : id;
        }).join(", ");
    return cond + " · " + payload;
  }

  function renderLinkedRules(){
    var allowBox = document.getElementById("linkedAllowRules");
    var excludeBox = document.getElementById("linkedExcludeRules");
    var priorityBox = document.getElementById("linkedPriorityRules");
    if(!allowBox || !excludeBox || !priorityBox) return;

    if(!selectedId){
      allowBox.innerHTML = '<div class="item">Seleziona una manovra.</div>';
      excludeBox.innerHTML = '<div class="item">Seleziona una manovra.</div>';
      priorityBox.innerHTML = '<div class="item">Seleziona una manovra.</div>';
      return;
    }

    var allowRules = ADMIN_COMMON.config.rules.filter(function(r){ return r.type === 'allow' && (r.maneuvers || []).indexOf(selectedId) >= 0; });
    var excludeRules = ADMIN_COMMON.config.rules.filter(function(r){ return r.type === 'exclude' && (r.maneuvers || []).indexOf(selectedId) >= 0; });
    var priorityRules = ADMIN_COMMON.config.rules.filter(function(r){ return r.type === 'priority' && (r.priority || []).indexOf(selectedId) >= 0; });

    allowBox.innerHTML = allowRules.length ? allowRules.map(function(r){
      return '<div class="item ok"><strong>'+r.name+'</strong><div class="mono">'+r.id+'</div><div class="subtle">'+summarizeRule(r)+'</div><div class="subtle">'+(r.note || '')+'</div></div>';
    }).join('') : '<div class="item">Nessuna regola di consenso collegata.</div>';

    excludeBox.innerHTML = excludeRules.length ? excludeRules.map(function(r){
      return '<div class="item no"><strong>'+r.name+'</strong><div class="mono">'+r.id+'</div><div class="subtle">'+summarizeRule(r)+'</div><div class="subtle">'+(r.note || '')+'</div></div>';
    }).join('') : '<div class="item">Nessuna regola di esclusione collegata.</div>';

    priorityBox.innerHTML = priorityRules.length ? priorityRules.map(function(r){
      return '<div class="item"><strong>'+r.name+'</strong><div class="mono">'+r.id+'</div><div class="subtle">'+summarizeRule(r)+'</div><div class="subtle">'+(r.note || '')+'</div></div>';
    }).join('') : '<div class="item">Nessuna regola di priorità collegata.</div>';
  }

  function listRender(){
    var list = document.getElementById("maneuversList");
    list.innerHTML = "";
    ADMIN_COMMON.config.maneuvers.forEach(function(item){
      var div = document.createElement("div");
      div.className = "item" + (selectedId === item.id ? " list-entry-active" : "");
      div.innerHTML = '<strong>'+item.label+'</strong><div class="mono">'+item.id+'</div><div class="subtle">Durata: '+item.durationMinutes+' min · Rischio: '+item.risk+' · Destinata a: '+(item.targetAudience||'ENTRAMBI')+' · Priorità: '+item.basePriority+(item.specialNone ? ' · specialNone' : '')+'</div>';
      div.onclick = function(){ selectedId = item.id; fillForm(item); listRender(); renderLinkedRules(); };
      list.appendChild(div);
    });
  }

  function fillForm(item){
    document.getElementById("maneuverId").value = item.id || "";
    document.getElementById("maneuverLabel").value = item.label || "";
    document.getElementById("maneuverDuration").value = item.durationMinutes || 0;
    document.getElementById("maneuverRisk").value = item.risk || "basso";
    document.getElementById("maneuverPriority").value = item.basePriority || 5;
    document.getElementById("maneuverAudience").value = item.targetAudience || "ENTRAMBI";
    document.getElementById("maneuverSpecialNone").checked = !!item.specialNone;
  }

  function readForm(){
    return {
      id: document.getElementById("maneuverId").value.trim(),
      label: document.getElementById("maneuverLabel").value.trim(),
      durationMinutes: Number(document.getElementById("maneuverDuration").value || 0),
      risk: document.getElementById("maneuverRisk").value,
      basePriority: Number(document.getElementById("maneuverPriority").value || 5),
      targetAudience: document.getElementById("maneuverAudience").value,
      specialNone: document.getElementById("maneuverSpecialNone").checked
    };
  }

  function bind(){
    document.getElementById("newManeuverBtn").onclick = function(){ selectedId = null; fillForm({id:"",label:"",durationMinutes:2,risk:"basso",basePriority:5,targetAudience:"ENTRAMBI",specialNone:false}); listRender(); renderLinkedRules(); };
    document.getElementById("saveManeuverBtn").onclick = function(){
      var obj = readForm();
      if(!obj.id || !obj.label) return alert("ID e label obbligatori.");
      var idx = ADMIN_COMMON.config.maneuvers.findIndex(function(x){ return x.id === selectedId; });
      if(idx >= 0){
        var oldId = ADMIN_COMMON.config.maneuvers[idx].id;
        ADMIN_COMMON.config.maneuvers[idx] = obj;
        ADMIN_COMMON.config.rules.forEach(function(r){
          if(r.maneuvers) r.maneuvers = r.maneuvers.map(function(x){ return x === oldId ? obj.id : x; });
          if(r.priority) r.priority = r.priority.map(function(x){ return x === oldId ? obj.id : x; });
        });
        if(ADMIN_COMMON.config.detailOverrides[oldId]){
          ADMIN_COMMON.config.detailOverrides[obj.id] = ADMIN_COMMON.config.detailOverrides[oldId];
          delete ADMIN_COMMON.config.detailOverrides[oldId];
        }
      } else {
        ADMIN_COMMON.config.maneuvers.push(obj);
      }
      selectedId = obj.id;
      ADMIN_COMMON.save("Manovra salvata.");
      listRender();
      renderLinkedRules();
    };
    document.getElementById("duplicateManeuverBtn").onclick = function(){
      var obj = readForm();
      if(!obj.id || !obj.label) return;
      obj.id = obj.id + "_COPY";
      obj.label = obj.label + " copia";
      obj.specialNone = false;
      ADMIN_COMMON.config.maneuvers.push(obj);
      selectedId = obj.id;
      fillForm(obj);
      ADMIN_COMMON.save("Manovra duplicata.");
      listRender();
      renderLinkedRules();
    };
    document.getElementById("deleteManeuverBtn").onclick = function(){
      if(!selectedId) return;
      if(!confirm("Eliminare la manovra selezionata?")) return;
      ADMIN_COMMON.config.maneuvers = ADMIN_COMMON.config.maneuvers.filter(function(x){ return x.id !== selectedId; });
      ADMIN_COMMON.config.rules.forEach(function(r){
        if(r.maneuvers) r.maneuvers = r.maneuvers.filter(function(x){ return x !== selectedId; });
        if(r.priority) r.priority = r.priority.filter(function(x){ return x !== selectedId; });
      });
      delete ADMIN_COMMON.config.detailOverrides[selectedId];
      selectedId = null;
      fillForm({id:"",label:"",durationMinutes:2,risk:"basso",basePriority:5,targetAudience:"ENTRAMBI",specialNone:false});
      ADMIN_COMMON.save("Manovra eliminata.");
      listRender();
      renderLinkedRules();
    };
  }

  async function init(){
    await ADMIN_COMMON.initBase();
    ADMIN_COMMON.requireAdmin(function(){
      bind();
      listRender();
      fillForm({id:"",label:"",durationMinutes:2,risk:"basso",basePriority:5,targetAudience:"ENTRAMBI",specialNone:false});
      renderLinkedRules();
    });
  }
  window.addEventListener("load", init);
})();