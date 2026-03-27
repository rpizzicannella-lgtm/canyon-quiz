(function(){
  var selectedId = null;
  var draftConditions = [];
  var draftChecks = [];

  function fieldOptions(){
    var opts = [
      { id:"situation", label:"Situazione", values: ADMIN_COMMON.config.situations.map(function(s){ return {id:s.id,label:s.label}; }) },
      { id:"risk_level", label:"Livello rischio", values:[{id:"BASSO",label:"Basso"},{id:"MEDIO",label:"Medio"},{id:"ALTO",label:"Alto"}] },
      { id:"urgency_level", label:"Urgenza", values:[{id:"BASSA",label:"Bassa"},{id:"MEDIA",label:"Media"},{id:"ALTA",label:"Alta"}] }
    ];
    (ADMIN_COMMON.config.variables || []).forEach(function(v){ opts.push({ id:v.id, label:v.label, values:v.values || [] }); });
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
  function opLabel(op){ return op === 'eq' ? 'uguale a' : op === 'neq' ? 'diverso da' : op === 'in' ? 'uno tra' : 'non tra'; }
  function maneuverLabel(id){
    var m = (ADMIN_COMMON.config.maneuvers || []).find(function(x){ return x.id === id; });
    return m ? m.label : id;
  }
  function condText(c){
    var vals = Array.isArray(c.value) ? c.value.map(function(v){ return valueLabel(c.field, v); }).join(", ") : valueLabel(c.field, c.value);
    return fieldMeta(c.field).label + " " + opLabel(c.op) + " " + vals;
  }
  function checkText(ch){
    if(ch.kind === 'allowed_contains') return 'Manovre consentite contengono ' + maneuverLabel(ch.value);
    if(ch.kind === 'allowed_not_contains') return 'Manovre consentite non contengono ' + maneuverLabel(ch.value);
    if(ch.kind === 'forbidden_contains') return 'Manovre escluse contengono ' + maneuverLabel(ch.value);
    if(ch.kind === 'best_answer_is') return 'Risposta finale è ' + maneuverLabel(ch.value);
    if(ch.kind === 'best_answer_not') return 'Risposta finale non è ' + maneuverLabel(ch.value);
    if(ch.kind === 'best_answer_in') return 'Risposta finale è una tra: ' + (Array.isArray(ch.value) ? ch.value.map(maneuverLabel).join(", ") : maneuverLabel(ch.value));
    if(ch.kind === 'allowed_any_of') return 'Almeno una manovra consentita tra: ' + (Array.isArray(ch.value) ? ch.value.map(maneuverLabel).join(", ") : maneuverLabel(ch.value));
    if(ch.kind === 'allowed_any_except') return 'Esiste una manovra consentita diversa da ' + maneuverLabel(ch.value);
    return ch.kind;
  }
  function listRender(){
    var list = document.getElementById("auditRulesList");
    list.innerHTML = "";
    (ADMIN_COMMON.config.auditRules || []).forEach(function(r){
      var div = document.createElement("div");
      div.className = "item" + (selectedId === r.id ? " list-entry-active" : "");
      div.innerHTML = '<strong>'+r.name+'</strong><div class="mono">'+r.id+'</div><div class="subtle">Gravità: '+(r.severity || 'MEDIA')+' · '+(r.enabled ? 'Attiva' : 'Disattiva')+'</div><div class="subtle">'+(r.conditions || []).map(condText).join(", ")+'</div><div class="subtle">'+(r.checks || []).map(checkText).join(" ; ")+'</div>';
      div.onclick = function(){ selectedId = r.id; fillForm(r); listRender(); };
      list.appendChild(div);
    });
  }
  function renderConditions(){
    var box = document.getElementById("auditConditionsList");
    box.innerHTML = "";
    if(!draftConditions.length){ box.innerHTML = '<div class="help-box">Nessuna condizione scenario.</div>'; return; }
    draftConditions.forEach(function(cond, idx){
      var row = document.createElement("div");
      row.className = "item";
      row.innerHTML = '<div class="condition-row"><label class="stacked">Campo<select class="cond-field" data-idx="'+idx+'"></select></label><label class="stacked">Condizione<select class="cond-op" data-idx="'+idx+'"><option value="eq">uguale a</option><option value="neq">diverso da</option><option value="in">uno tra</option><option value="not_in">non tra</option></select></label><div class="stacked"><label>Valore/i</label><div class="cond-value-box" data-idx="'+idx+'"></div></div><button type="button" class="cond-delete" data-idx="'+idx+'">Elimina</button></div><div class="subtle">'+condText(cond)+'</div>';
      box.appendChild(row);
      var sel = row.querySelector('.cond-field');
      fieldOptions().forEach(function(f){
        var o=document.createElement('option'); o.value=f.id; o.textContent=f.label; if(cond.field===f.id) o.selected=true; sel.appendChild(o);
      });
      row.querySelector('.cond-op').value = cond.op;
      renderConditionValueControl(idx);
    });
    box.querySelectorAll('.cond-field').forEach(function(el){ el.onchange=function(){ var idx=Number(this.dataset.idx); draftConditions[idx].field=this.value; draftConditions[idx].value=''; renderConditions(); };});
    box.querySelectorAll('.cond-op').forEach(function(el){ el.onchange=function(){ var idx=Number(this.dataset.idx); draftConditions[idx].op=this.value; draftConditions[idx].value=(this.value==='in'||this.value==='not_in')?[]:''; renderConditions(); };});
    box.querySelectorAll('.cond-delete').forEach(function(el){ el.onclick=function(){ draftConditions.splice(Number(this.dataset.idx),1); renderConditions(); };});
  }
  function renderConditionValueControl(idx){
    var cond = draftConditions[idx], meta = fieldMeta(cond.field), wrap = document.querySelector('.cond-value-box[data-idx="'+idx+'"]');
    wrap.innerHTML='';
    if(cond.op==='eq' || cond.op==='neq'){
      var select=document.createElement('select'); select.className='text-input';
      var empty=document.createElement('option'); empty.value=''; empty.textContent='-- seleziona --'; select.appendChild(empty);
      (meta.values||[]).forEach(function(v){ var o=document.createElement('option'); o.value=v.id; o.textContent=v.label; if(cond.value===v.id) o.selected=true; select.appendChild(o); });
      select.onchange=function(){ draftConditions[idx].value=this.value; renderConditions(); };
      wrap.appendChild(select);
    } else {
      var current=Array.isArray(cond.value)?cond.value:[];
      var box=document.createElement('div'); box.className='choice-box';
      (meta.values||[]).forEach(function(v){
        var label=document.createElement('label'); label.className='choice-item';
        var cb=document.createElement('input'); cb.type='checkbox'; cb.checked=current.indexOf(v.id)>=0;
        cb.onchange=function(){ var arr=Array.isArray(draftConditions[idx].value)?draftConditions[idx].value.slice():[]; if(this.checked){ if(arr.indexOf(v.id)<0) arr.push(v.id); } else { arr=arr.filter(function(x){ return x!==v.id; }); } draftConditions[idx].value=arr; renderConditions(); };
        label.appendChild(cb); var span=document.createElement('span'); span.textContent=v.label; label.appendChild(span); box.appendChild(label);
      });
      wrap.appendChild(box);
    }
  }
  function renderChecks(){
    var box = document.getElementById("auditChecksList");
    box.innerHTML = "";
    if(!draftChecks.length){ box.innerHTML = '<div class="help-box">Nessun controllo audit.</div>'; return; }
    draftChecks.forEach(function(ch, idx){
      var row = document.createElement("div");
      row.className = "item";
      row.innerHTML = '<div class="condition-row"><label class="stacked">Controllo<select class="check-kind" data-idx="'+idx+'"><option value="allowed_contains">Consentite contengono</option><option value="allowed_not_contains">Consentite non contengono</option><option value="forbidden_contains">Escluse contengono</option><option value="best_answer_is">Risposta finale è</option><option value="best_answer_not">Risposta finale non è</option><option value="best_answer_in">Risposta finale è una tra</option><option value="allowed_any_of">Almeno una consentita tra</option><option value="allowed_any_except">Esiste consentita diversa da</option></select></label><div class="stacked"><label>Valore/i</label><div class="check-value-box" data-idx="'+idx+'"></div></div><button type="button" class="check-delete" data-idx="'+idx+'">Elimina</button></div><div class="subtle">'+checkText(ch)+'</div>';
      box.appendChild(row);
      row.querySelector('.check-kind').value = ch.kind;
      renderCheckValueControl(idx);
    });
    box.querySelectorAll('.check-kind').forEach(function(el){ el.onchange=function(){ var idx=Number(this.dataset.idx); draftChecks[idx].kind=this.value; draftChecks[idx].value=''; renderChecks(); }; });
    box.querySelectorAll('.check-delete').forEach(function(el){ el.onclick=function(){ draftChecks.splice(Number(this.dataset.idx),1); renderChecks(); }; });
  }
  function renderCheckValueControl(idx){
    var ch = draftChecks[idx], wrap = document.querySelector('.check-value-box[data-idx="'+idx+'"]');
    wrap.innerHTML = '';
    var multi = ch.kind === 'best_answer_in' || ch.kind === 'allowed_any_of';
    if(multi){
      var current = Array.isArray(ch.value) ? ch.value : [];
      var box=document.createElement('div'); box.className='choice-box';
      (ADMIN_COMMON.config.maneuvers||[]).forEach(function(m){
        var label=document.createElement('label'); label.className='choice-item';
        var cb=document.createElement('input'); cb.type='checkbox'; cb.checked=current.indexOf(m.id)>=0;
        cb.onchange=function(){ var arr=Array.isArray(draftChecks[idx].value)?draftChecks[idx].value.slice():[]; if(this.checked){ if(arr.indexOf(m.id)<0) arr.push(m.id); } else arr=arr.filter(function(x){ return x!==m.id; }); draftChecks[idx].value=arr; renderChecks(); };
        label.appendChild(cb); var span=document.createElement('span'); span.textContent=m.label; label.appendChild(span); box.appendChild(label);
      });
      wrap.appendChild(box);
    } else {
      var select=document.createElement('select'); select.className='text-input';
      var empty=document.createElement('option'); empty.value=''; empty.textContent='-- seleziona --'; select.appendChild(empty);
      (ADMIN_COMMON.config.maneuvers||[]).forEach(function(m){ var o=document.createElement('option'); o.value=m.id; o.textContent=m.label; if(ch.value===m.id) o.selected=true; select.appendChild(o); });
      select.onchange=function(){ draftChecks[idx].value=this.value; renderChecks(); };
      wrap.appendChild(select);
    }
  }
  function fillForm(rule){
    draftConditions = JSON.parse(JSON.stringify(rule.conditions || []));
    draftChecks = JSON.parse(JSON.stringify(rule.checks || []));
    document.getElementById('auditRuleId').value = rule.id || '';
    document.getElementById('auditRuleName').value = rule.name || '';
    document.getElementById('auditRuleSeverity').value = rule.severity || 'MEDIA';
    document.getElementById('auditRuleEnabled').checked = !!rule.enabled;
    document.getElementById('auditRuleProblem').value = rule.problem || '';
    document.getElementById('auditRuleSuggestion').value = rule.suggestion || '';
    renderConditions();
    renderChecks();
  }
  function readForm(){
    return {
      id: document.getElementById('auditRuleId').value.trim(),
      name: document.getElementById('auditRuleName').value.trim(),
      severity: document.getElementById('auditRuleSeverity').value,
      enabled: document.getElementById('auditRuleEnabled').checked,
      conditions: JSON.parse(JSON.stringify(draftConditions)),
      checks: JSON.parse(JSON.stringify(draftChecks)),
      problem: document.getElementById('auditRuleProblem').value.trim(),
      suggestion: document.getElementById('auditRuleSuggestion').value.trim()
    };
  }
  function bind(){
    document.getElementById('addAuditConditionBtn').onclick = function(){ var first=fieldOptions()[0]; draftConditions.push({ field:first.id, op:'eq', value:'' }); renderConditions(); };
    document.getElementById('addAuditCheckBtn').onclick = function(){ draftChecks.push({ kind:'allowed_contains', value:'' }); renderChecks(); };
    document.getElementById('newAuditRuleBtn').onclick = function(){ selectedId=null; fillForm({id:'',name:'',severity:'MEDIA',enabled:true,conditions:[],checks:[],problem:'',suggestion:''}); listRender(); };
    document.getElementById('saveAuditRuleBtn').onclick = function(){
      var obj=readForm();
      if(!obj.id || !obj.name) return alert('ID e nome obbligatori.');
      ADMIN_COMMON.config.auditRules = ADMIN_COMMON.config.auditRules || [];
      var idx=ADMIN_COMMON.config.auditRules.findIndex(function(x){ return x.id===selectedId; });
      if(idx>=0) ADMIN_COMMON.config.auditRules[idx]=obj; else ADMIN_COMMON.config.auditRules.push(obj);
      selectedId=obj.id;
      ADMIN_COMMON.save('Regola audit salvata.');
      listRender();
    };
    document.getElementById('duplicateAuditRuleBtn').onclick = function(){
      var obj=readForm();
      if(!obj.id || !obj.name) return;
      obj.id = obj.id + '_COPY';
      obj.name = obj.name + ' copia';
      ADMIN_COMMON.config.auditRules.push(obj);
      selectedId=obj.id;
      fillForm(obj);
      ADMIN_COMMON.save('Regola audit duplicata.');
      listRender();
    };
    document.getElementById('deleteAuditRuleBtn').onclick = function(){
      if(!selectedId) return;
      if(!confirm('Eliminare la regola audit selezionata?')) return;
      ADMIN_COMMON.config.auditRules = (ADMIN_COMMON.config.auditRules || []).filter(function(x){ return x.id !== selectedId; });
      selectedId=null;
      fillForm({id:'',name:'',severity:'MEDIA',enabled:true,conditions:[],checks:[],problem:'',suggestion:''});
      ADMIN_COMMON.save('Regola audit eliminata.');
      listRender();
    };
  }
  async function init(){
    await ADMIN_COMMON.initBase();
    ADMIN_COMMON.requireAdmin(function(){
      ADMIN_COMMON.config.auditRules = ADMIN_COMMON.config.auditRules || [];
      bind();
      listRender();
      fillForm({id:'',name:'',severity:'MEDIA',enabled:true,conditions:[],checks:[],problem:'',suggestion:''});
    });
  }
  window.addEventListener('load', init);
})();