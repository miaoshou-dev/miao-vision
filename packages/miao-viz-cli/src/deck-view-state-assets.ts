export const DECK_VIEW_STATE_JS = `
  function renderMetrics(filtered) {
    document.querySelectorAll('.slide.active [data-miao-metric]').forEach(function(container) {
      var slide=spec.slides[Number(container.getAttribute('data-slide-index'))];
      var metric=slide && slide.metrics && slide.metrics[Number(container.getAttribute('data-metric-index'))];
      if(!metric) return;
      var chart={type:'bigvalue',encoding:{},data:metric.data||{}};
      var prepared=md.prepareRows(filtered,chart);
      var raw=metric.value;
      if(raw===undefined && prepared[0]) { var keys=Object.keys(prepared[0]); raw=prepared[0][keys[0]]; }
      var value=container.querySelector('.v'); if(value) value.textContent=raw==null?'—':String(raw);
      var label=container.querySelector('.l'); if(label) label.innerHTML=md.escapeHtml(metric.label)+' <span class="miao-view-derived">Current filter</span>';
    });
  }

  function renderViewState(filtered) {
    var activeSlide=getActiveSlide(); if(!activeSlide) return;
    var el=activeSlide.querySelector('.miao-view-state'); if(!el){el=document.createElement('div');el.className='miao-view-state';activeSlide.insertBefore(el,activeSlide.firstChild);}
    var active=Object.keys(state.filters).filter(function(key){var value=state.filters[key];return value!==''&&value!=null&&(!Array.isArray(value)||value.some(Boolean));});
    el.innerHTML='<span>View: '+filtered.length+' / '+rows.length+' rows</span>'+active.map(function(key){return '<span class="miao-chip">'+md.escapeHtml(key)+': '+md.escapeHtml(Array.isArray(state.filters[key])?state.filters[key].join(' – '):String(state.filters[key]))+'</span>';}).join('')+(active.length?'<button id="deck-view-copy">Copy view link</button><button id="deck-view-reset">Reset all</button>':'<span>Base evidence view</span>');
    var reset=el.querySelector('#deck-view-reset');if(reset)reset.onclick=function(){state.filters={};state.selection=null;state.drilldown=null;filterPanel&&filterPanel.querySelectorAll('select,input').forEach(function(input){input.value='';input.checked=false;});updateActiveSlide();};
    var copy=el.querySelector('#deck-view-copy');if(copy)copy.onclick=function(){if(navigator.clipboard)navigator.clipboard.writeText(location.href);};
    activeSlide.querySelectorAll('.slide-claim,.sub').forEach(function(claim){claim.setAttribute('data-view-scope',active.length?'base-evidence':'current');claim.title=active.length?'Claim is based on the complete dataset.':'';});
    try{location.hash=active.length?'miao='+encodeURIComponent(JSON.stringify({filters:state.filters})):'';}catch(_){}
  }
`
