export const TRUSTED_RUNTIME_CSS = `
.miao-trust-scopes { margin:0 0 18px; padding:12px; border:1px solid rgba(128,128,128,.2); border-radius:4px; }
.miao-current-view-grid { display:flex; flex-wrap:wrap; gap:12px; margin-top:8px; }
.miao-current-summary { min-width:130px; padding:8px 10px; background:rgba(128,128,128,.06); border-radius:4px; }
.miao-current-summary strong { display:block; font-size:18px; margin-top:3px; }
.miao-scope-note { font-size:11px; opacity:.62; }
.miao-exposure { margin:0 0 18px; padding:10px 12px; border:1px solid rgba(128,128,128,.18); border-radius:4px; font-size:12px; }
.miao-exposure dl { display:grid; grid-template-columns:90px 1fr; gap:6px 10px; }
.miao-exposure dd { margin:0; overflow-wrap:anywhere; }
@media print { .miao-exposure { display:none !important; } }
`

export const TRUSTED_RUNTIME_JS = `
(function(){
  var specEl=document.getElementById('miao-viz-spec');
  if(!specEl)return;
  var spec=JSON.parse(specEl.textContent||'{}');
  var trusted=Boolean(spec.interactions&&spec.interactions.dataPolicy);
  var summaries=(spec.interactions&&spec.interactions.currentView&&spec.interactions.currentView.summaries)||[];
  if(!trusted&&!summaries.length)return;
  var zh=spec.locale==='zh-CN';
  var copy=zh?{
    current:'当前视图',published:'发布结论',local:'本地计算',full:'基于完整发布数据集',empty:'当前视图无数据',rows:'行'
  }:{current:'Current view',published:'Published findings',local:'Calculated locally',full:'Based on the full published dataset',empty:'No data for current view',rows:'rows'};
  var main=document.querySelector('.miao-viz-report');
  if(!main)return;
  var scopes=document.createElement('section');
  scopes.className='miao-trust-scopes';
  scopes.innerHTML='<strong>'+copy.current+'</strong><div class="miao-scope-note">'+copy.local+'</div><div class="miao-current-view-grid"></div>';
  if(summaries.length){
    var header=main.querySelector('header');
    main.insertBefore(scopes,header?header.nextSibling:main.firstChild);
  }
  document.querySelectorAll('.report-insights').forEach(function(el){var note=document.createElement('div');note.className='miao-scope-note';note.textContent=copy.published+' · '+copy.full;el.insertBefore(note,el.firstChild);});

  function valueFor(rows,recipe){
    var working=rows.slice();
    (recipe.filters||[]).forEach(function(filter){working=working.filter(function(row){var a=row[filter.field],b=filter.value;if(filter.operator==='eq')return String(a)==String(b);a=window.miaoData.comparableValue(a);b=window.miaoData.comparableValue(b);if(a==null||b==null)return false;return filter.operator==='gte'?a>=b:filter.operator==='lte'?a<=b:filter.operator==='gt'?a>b:a<b;});});
    if(recipe.groupBy&&recipe.groupBy.length){
      var groups=new Map();working.forEach(function(row){var key=JSON.stringify(recipe.groupBy.map(function(field){return row[field];}));var group=groups.get(key)||[];group.push(row);groups.set(key,group);});
      var output=Array.from(groups.values()).map(function(group){var out={};recipe.groupBy.forEach(function(field){out[field]=group[0][field];});(recipe.measures||[]).forEach(function(m){out[m.alias]=window.miaoData.aggregateMeasure(group,{field:m.field,op:m.operation});});return out;});
      if(recipe.orderBy&&recipe.orderBy[0]){var order=recipe.orderBy[0];output.sort(function(a,b){var av=a[order.field],bv=b[order.field];return (Number(av)-Number(bv))*(order.direction==='desc'?-1:1);});}
      return output.length?output[0][recipe.groupBy[0]]:null;
    }
    var measures=recipe.measures||[];
    if(measures.length>1)return measures.map(function(measure){return window.miaoData.aggregateMeasure(working,{field:measure.field,op:measure.operation});}).join(' - ');
    var measure=measures[0];return measure?window.miaoData.aggregateMeasure(working,{field:measure.field,op:measure.operation}):working.length;
  }
  function format(value,format){if(value==null||Number.isNaN(value))return copy.empty;if(format==='integer')return Math.round(Number(value)).toLocaleString();if(format==='percentage')return (Number(value)*100).toFixed(1)+'%';if(format==='currency')return Number(value).toLocaleString(undefined,{style:'currency',currency:'CNY'});return typeof value==='number'?value.toLocaleString():String(value);}
  function render(event){var detail=event&&event.detail;if(!detail)return;var grid=scopes.querySelector('.miao-current-view-grid');grid.innerHTML='';summaries.forEach(function(summary){var card=document.createElement('div');card.className='miao-current-summary';var value=detail.filtered.length?format(valueFor(detail.filtered,summary.recipe),summary.format):copy.empty;card.innerHTML='<span>'+window.miaoData.escapeHtml(summary.label)+'</span><strong>'+window.miaoData.escapeHtml(value)+'</strong>';grid.appendChild(card);});scopes.dataset.filtered=String(detail.filtered.length);renderEvidence(detail);}
  function renderEvidence(detail){var drawer=document.querySelector('.evidence-panel');if(!drawer)return;var section=drawer.querySelector('.miao-current-evidence');if(!section){section=document.createElement('section');section.className='miao-current-evidence evidence-current';drawer.appendChild(section);}var active=Object.keys(detail.state.filters||{}).filter(function(key){var value=detail.state.filters[key];return value!==''&&value!=null&&(!Array.isArray(value)||value.some(Boolean));});section.textContent=copy.current+': '+detail.filtered.length+' / '+detail.total+' '+copy.rows+'. '+copy.local+'. '+active.map(function(key){return key+'='+String(detail.state.filters[key]);}).join(', ')+' Recipes: '+JSON.stringify(summaries.map(function(summary){return summary.recipe;}));}
  window.addEventListener('miao:view-update',render);
})();
`
