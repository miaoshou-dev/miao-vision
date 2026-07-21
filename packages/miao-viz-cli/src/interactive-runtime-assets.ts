export const INTERACTIVE_CSS = `
.miao-interactive-controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; margin: 0 0 24px; padding: 12px 0; border-top: 1px solid rgba(128,128,128,0.18); border-bottom: 1px solid rgba(128,128,128,0.18); }
.miao-filter { display: grid; gap: 5px; font-size: 12px; }
.miao-filter label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.56; }
.miao-filter select, .miao-filter input { min-width: 140px; border: 1px solid rgba(128,128,128,0.28); border-radius: 4px; padding: 6px 8px; background: transparent; color: inherit; font: inherit; }
.miao-filter-range { display: flex; gap: 6px; }
.miao-reset { border: 1px solid rgba(128,128,128,0.28); border-radius: 4px; padding: 7px 10px; background: transparent; color: inherit; cursor: pointer; font: inherit; }
.miao-reset:hover { background: rgba(128,128,128,0.08); }
`

export const INTERACTIVE_JS = `
(function() {
  var md = window.miaoData;
  if (!md) return;
  var specEl = document.getElementById('miao-viz-spec');
  var dataEl = document.getElementById('miao-viz-data');
  if (!specEl || !dataEl) return;

  var spec = JSON.parse(specEl.textContent || '{}');
  var rows = JSON.parse(dataEl.textContent || '[]');
  var filters = (spec.interactions && spec.interactions.globalFilters) || [];
  var charts = spec.charts || [];
  var state = { filters: {}, selection: null, sort: {}, drilldown: null };

  function createTooltip() {
    var el = document.createElement('div');
    el.className = 'miao-tooltip';
    el.hidden = true;
    document.body.appendChild(el);
    return el;
  }

  var tooltip = createTooltip();

  function uniqueValues(field) {
    return md.uniqueValues(rows, field, 200);
  }

  function renderControls() {
    if (!filters.length) return;
    var main = document.querySelector('.miao-viz-report');
    if (!main) return;
    var controls = document.createElement('section');
    controls.className = 'miao-interactive-controls';
    controls.setAttribute('aria-label', 'Interactive filters');
    filters.forEach(function(filter) {
      controls.appendChild(filter.type === 'range' ? renderRangeFilter(filter) : renderSelectFilter(filter));
    });
    var reset = document.createElement('button');
    reset.type = 'button';
    reset.className = 'miao-reset';
    reset.textContent = 'Reset';
    reset.addEventListener('click', function() {
      state.filters = {};
      state.selection = null;
      state.drilldown = null;
      controls.querySelectorAll('select,input').forEach(function(input) { input.value = ''; input.checked = false; });
      update();
    });
    controls.appendChild(reset);
    var header = main.querySelector('header');
    main.insertBefore(controls, header ? header.nextSibling : main.firstChild);
  }

  function renderSelectFilter(filter) {
    var wrap = document.createElement('div');
    wrap.className = 'miao-filter';
    var label = document.createElement('label');
    label.textContent = filter.field;
    wrap.appendChild(label);
    if (filter.multiSelect) {
      renderMultiSelect(wrap, filter);
    } else {
      renderSingleSelect(wrap, filter);
    }
    return wrap;
  }

  function renderSingleSelect(wrap, filter) {
    var values = uniqueValues(filter.field);
    if (values.length >= 20) {
      var input = document.createElement('input');
      input.className = 'miao-filter-search';
      input.placeholder = 'Search ' + filter.field + '...';
      input.setAttribute('list', 'miao-sg-' + md.escapeAttr(filter.field));
      var datalist = document.createElement('datalist');
      datalist.id = 'miao-sg-' + md.escapeAttr(filter.field);
      values.forEach(function(v) {
        var opt = document.createElement('option');
        opt.value = v;
        datalist.appendChild(opt);
      });
      input.addEventListener('change', function() {
        state.filters[filter.field] = input.value;
        update();
      });
      wrap.appendChild(input);
      wrap.appendChild(datalist);
    } else {
      var select = document.createElement('select');
      select.innerHTML = '<option value="">All</option>' + values.map(function(value) {
        return '<option value="' + md.escapeAttr(value) + '">' + md.escapeHtml(value) + '</option>';
      }).join('');
      select.addEventListener('change', function() {
        state.filters[filter.field] = select.value;
        update();
      });
      wrap.appendChild(select);
    }
  }

  function renderMultiSelect(wrap, filter) {
    var values = uniqueValues(filter.field);
    state.filters[filter.field] = state.filters[filter.field] || [];
    if (values.length >= 20) {
      renderSearchableMulti(wrap, filter, values);
    } else {
      renderCheckboxes(wrap, filter, values);
    }
  }

  function renderCheckboxes(wrap, filter, values) {
    var container = document.createElement('div');
    container.className = 'miao-filter-checks';
    values.forEach(function(v) {
      var labelEl = document.createElement('label');
      labelEl.className = 'miao-chip';
      var cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.value = v;
      cb.addEventListener('change', function() {
        var arr = state.filters[filter.field] || [];
        if (cb.checked) {
          if (arr.indexOf(v) === -1) arr.push(v);
        } else {
          var idx = arr.indexOf(v);
          if (idx !== -1) arr.splice(idx, 1);
        }
        update();
      });
      labelEl.appendChild(cb);
      labelEl.appendChild(document.createTextNode(' ' + v));
      container.appendChild(labelEl);
    });
    wrap.appendChild(container);
  }

  function renderSearchableMulti(wrap, filter, values) {
    var searchInput = document.createElement('input');
    searchInput.className = 'miao-filter-search';
    searchInput.placeholder = 'Filter ' + filter.field + '...';
    var container = document.createElement('div');
    container.className = 'miao-filter-checks miao-filter-checks-scroll';
    function renderFiltered(term) {
      container.innerHTML = '';
      var filtered = term ? values.filter(function(v) { return v.toLowerCase().indexOf(term.toLowerCase()) !== -1; }) : values.slice(0, 100);
      filtered.forEach(function(v) {
        var labelEl = document.createElement('label');
        labelEl.className = 'miao-chip';
        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.value = v;
        var arr = state.filters[filter.field] || [];
        cb.checked = arr.indexOf(v) !== -1;
        cb.addEventListener('change', function() {
          if (cb.checked) {
            if (arr.indexOf(v) === -1) arr.push(v);
          } else {
            var idx = arr.indexOf(v);
            if (idx !== -1) arr.splice(idx, 1);
          }
          update();
        });
        labelEl.appendChild(cb);
        labelEl.appendChild(document.createTextNode(' ' + v));
        container.appendChild(labelEl);
      });
    }
    searchInput.addEventListener('input', function() { renderFiltered(searchInput.value); });
    renderFiltered('');
    wrap.appendChild(searchInput);
    wrap.appendChild(container);
  }

  function renderRangeFilter(filter) {
    var wrap = document.createElement('div');
    wrap.className = 'miao-filter';
    var label = document.createElement('label');
    label.textContent = filter.field;
    var pair = document.createElement('div');
    pair.className = 'miao-filter-range';
    var useDate = md.guessFieldType(rows, filter.field) === 'date';
    var min = document.createElement('input');
    var max = document.createElement('input');
    if (useDate) {
      min.type = 'date';
      max.type = 'date';
    } else {
      min.placeholder = 'Min';
      max.placeholder = 'Max';
    }
    [min, max].forEach(function(input) {
      input.addEventListener('input', function() {
        state.filters[filter.field] = [min.value, max.value];
        update();
      });
    });
    pair.appendChild(min);
    pair.appendChild(max);
    wrap.appendChild(label);
    wrap.appendChild(pair);
    return wrap;
  }

  function chartSpec(chartId) {
    return charts.find(function(chart, index) { return (chart.id || ('chart-' + (index + 1))) === chartId; }) || null;
  }

  function canSelect(chart) {
    return Boolean(chart && ((chart.interaction && chart.interaction.select) || chart.drilldownPreset));
  }

  function renderChart(container, chart, sourceRows) {
    if (!chart) return;
    var slot = container.querySelector('.miao-render-slot');
    if (!slot) return;
    var chartId = container.getAttribute('data-miao-chart');
    var data = sourceRows;
    if (state.drilldown && state.drilldown.targetId === chartId) {
      data = sourceRows.filter(function(row) {
        return String(row[state.drilldown.field] == null ? '' : row[state.drilldown.field]) === String(state.drilldown.value);
      });
    }
    var chartRows = md.prepareRows(data, chart);
    if (!chartRows.length) slot.innerHTML = md.renderNoData();
    else if (chart.type === 'bar') slot.innerHTML = md.renderBar(chart, chartRows, chartId);
    else if (['line','area','scatter'].indexOf(chart.type) !== -1) slot.innerHTML = md.renderXY(chart, chartRows, chartId);
    else if (chart.type === 'pie') slot.innerHTML = md.renderPie(chart, chartRows, chartId);
    else if (chart.type === 'bigvalue') slot.innerHTML = md.renderBigValue(chart, chartRows);
    else if (chart.type === 'table') {
      var sortState = state.sort[chartId] || null;
      slot.innerHTML = md.renderTable(chart, chartRows, chartId, sortState);
      if (chart.sortable) bindSortHeaders(container, chartId);
    }
  }

  function bindSortHeaders(container, chartId) {
    var handler = function(e) {
      var th = e.target.closest('th[data-sortable]');
      if (!th) return;
      var field = th.getAttribute('data-sort-field');
      if (!field) return;
      var current = state.sort[chartId];
      var newOrder;
      if (!current || current.field !== field) newOrder = 'asc';
      else if (current.order === 'asc') newOrder = 'desc';
      else newOrder = null;
      state.sort[chartId] = newOrder ? { field: field, order: newOrder } : null;
      update();
    };
    container.onclick = handler;
  }

  function bindMarks() {
    document.querySelectorAll('[data-miao-mark]').forEach(function(mark) {
      if (mark.getAttribute('data-miao-bound') === 'true') return;
      mark.setAttribute('data-miao-bound', 'true');
      var chart = chartSpec(mark.getAttribute('data-chart-id'));
      mark.addEventListener('mouseenter', function(event) {
        var text = mark.getAttribute('data-tooltip');
        if (!text) return;
        tooltip.textContent = text;
        tooltip.hidden = false;
        moveTooltip(event);
      });
      mark.addEventListener('mousemove', moveTooltip);
      mark.addEventListener('mouseleave', function() { tooltip.hidden = true; });
      mark.addEventListener('click', function() {
        var field = mark.getAttribute('data-field');
        var value = mark.getAttribute('data-value');
        if (!field) return;
        var chartId = mark.getAttribute('data-chart-id');
        if (chart && chart.drilldownChart) {
          var same = state.drilldown && String(state.drilldown.value) === String(value) && state.drilldown.field === field;
          state.drilldown = same ? null : { field: field, value: value, targetId: chart.drilldownChart, sourceId: chartId };
          if (state.drilldown) {
            var target = document.querySelector('[data-miao-chart="' + md.escapeAttr(chart.drilldownChart) + '"]');
            if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
          update();
          return;
        }
        if (!canSelect(chart)) return;
        state.selection = state.selection && state.selection.field === field && String(state.selection.value) === String(value)
          ? null
          : { field: field, value: value };
        update();
      });
    });
  }

  function renderDrilldownBreadcrumb() {
    var main = document.querySelector('.miao-viz-report');
    if (!main) return;
    var existing = document.getElementById('miao-drilldown-bar');
    if (!state.drilldown) {
      if (existing) existing.remove();
      return;
    }
    if (existing) existing.remove();
    var bar = document.createElement('div');
    bar.id = 'miao-drilldown-bar';
    bar.className = 'miao-drilldown-bar';
    bar.innerHTML = '<span class="miao-drilldown-label">Drilldown: </span>' +
      '<span class="miao-drilldown-chip">' + md.escapeHtml(state.drilldown.field) + ': ' + md.escapeHtml(String(state.drilldown.value)) +
      ' <button class="miao-drilldown-clear">&times;</button></span>';
    bar.querySelector('.miao-drilldown-clear').addEventListener('click', function() {
      state.drilldown = null;
      update();
    });
    var controls = main.querySelector('.miao-interactive-controls');
    var header = main.querySelector('header');
    main.insertBefore(bar, controls || (header ? header.nextSibling : main.firstChild));
  }

  function update() {
    var filtered = md.applyFilters(rows, filters, state.filters);
    document.querySelectorAll('[data-miao-chart]').forEach(function(container) {
      var chart = chartSpec(container.getAttribute('data-miao-chart'));
      renderChart(container, chart, filtered);
    });
    bindMarks();
    document.querySelectorAll('[data-miao-mark]').forEach(function(mark) {
      var field = mark.getAttribute('data-field');
      var value = mark.getAttribute('data-value');
      var selected = state.selection && state.selection.field === field && String(state.selection.value) === String(value);
      mark.setAttribute('data-miao-selected', selected ? 'true' : 'false');
      mark.classList.toggle('miao-mark-hidden', Boolean((state.selection && !selected) || !markMatchesFilters(field, value)));
    });
    document.querySelectorAll('[data-miao-chart]').forEach(function(container) {
      renderDetail(container, filtered);
    });
    renderDrilldownBreadcrumb();
    renderViewState(filtered);
  }

  function renderViewState(filtered) {
    var main = document.querySelector('.miao-viz-report');
    if (!main) return;
    var el = document.getElementById('miao-view-state');
    if (!el) { el=document.createElement('div'); el.id='miao-view-state'; el.className='miao-view-state'; var controls=main.querySelector('.miao-interactive-controls'); main.insertBefore(el, controls ? controls.nextSibling : main.firstChild); }
    var active=Object.keys(state.filters).filter(function(key){ var value=state.filters[key]; return value !== '' && value != null && (!Array.isArray(value) || value.some(Boolean)); });
    el.innerHTML='<span>View: '+filtered.length+' / '+rows.length+' rows</span>'+active.map(function(key){return '<span class="miao-chip">'+md.escapeHtml(key)+': '+md.escapeHtml(Array.isArray(state.filters[key])?state.filters[key].join(' – '):String(state.filters[key]))+'</span>';}).join('')+(active.length?'<button id="miao-view-copy">Copy view link</button><button id="miao-view-reset">Reset all</button>':'<span>Base evidence view</span>');
    var reset=document.getElementById('miao-view-reset'); if(reset) reset.onclick=function(){state.filters={};state.selection=null;state.drilldown=null;document.querySelectorAll('.miao-interactive-controls select,.miao-interactive-controls input').forEach(function(input){input.value='';input.checked=false;});update();};
    var copy=document.getElementById('miao-view-copy'); if(copy) copy.onclick=function(){if(navigator.clipboard)navigator.clipboard.writeText(location.href);};
    document.querySelectorAll('.report-insights').forEach(function(insights){insights.setAttribute('data-view-scope',active.length?'base-evidence':'current');insights.title=active.length?'Claims are based on the complete dataset.':'';});
    try { location.hash = active.length ? 'miao=' + encodeURIComponent(JSON.stringify({filters:state.filters})) : ''; } catch (_) {}
  }

  function renderDetail(container, filtered) {
    var chartId = container.getAttribute('data-miao-chart');
    var detail = container.querySelector('.miao-detail');
    if (!detail) {
      detail = document.createElement('div');
      detail.className = 'miao-detail';
      container.appendChild(detail);
    }
    if (!state.selection) {
      detail.innerHTML = '';
      detail.hidden = true;
      return;
    }
    var selectedRows = filtered.filter(function(row) {
      return String(row[state.selection.field] == null ? '' : row[state.selection.field]) === String(state.selection.value);
    });
    detail.hidden = false;
    detail.innerHTML = md.renderDetailTable(selectedRows, chartId, filtered);
  }

  function moveTooltip(event) {
    tooltip.style.left = event.clientX + 'px';
    tooltip.style.top = event.clientY + 'px';
  }

  function markMatchesFilters(field, value) {
    var activeFilters = filters.filter(function(filter) { return filter.field === field; });
    if (!activeFilters.length) return true;
    return activeFilters.every(function(filter) {
      var active = state.filters[filter.field];
      if (active == null || active === '' || (Array.isArray(active) && !active[0] && !active[1])) return true;
      if (filter.type === 'select') {
        if (Array.isArray(active)) {
          if (active.length === 0) return true;
          return active.indexOf(String(value == null ? '' : value)) !== -1;
        }
        return String(value == null ? '' : value) === String(active);
      }
      var current = md.comparableValue(value);
      if (current == null) return false;
      var min = md.comparableValue(active[0]);
      var max = md.comparableValue(active[1]);
      if (min != null && current < min) return false;
      if (max != null && current > max) return false;
      return true;
    });
  }

  try { if(location.hash.indexOf('#miao=')===0) { var saved=JSON.parse(decodeURIComponent(location.hash.slice(6))); state.filters=saved.filters||{}; } } catch (_) {}
  var printState=null;
  window.addEventListener('beforeprint',function(){printState=JSON.parse(JSON.stringify(state.filters));state.filters={};update();});
  window.addEventListener('afterprint',function(){state.filters=printState||{};printState=null;update();});
  renderControls();
  update();
})();
`
