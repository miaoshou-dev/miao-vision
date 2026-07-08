export const DECK_INTERACTIVE_JS = `
(function() {
  var md = window.miaoData;
  if (!md) return;
  var specEl = document.getElementById('miao-viz-deck');
  var dataEl = document.getElementById('miao-viz-data');
  if (!specEl || !dataEl) return;

  var spec = JSON.parse(specEl.textContent || '{}');
  var rows = JSON.parse(dataEl.textContent || '[]');
  var filters = (spec.interactions && spec.interactions.globalFilters) || [];
  var state = { filters: {}, selection: null, sort: {}, drilldown: null };

  var tooltip = null;
  var filterPanel = null;
  var filterBtn = null;
  var overlay = null;

  function createTooltip() {
    var el = document.createElement('div');
    el.className = 'miao-tooltip';
    el.hidden = true;
    document.body.appendChild(el);
    return el;
  }

  function createOverlay() {
    var el = document.createElement('div');
    el.className = 'deck-overlay';
    el.addEventListener('click', function() { closeFilterPanel(); });
    document.body.appendChild(el);
    return el;
  }

  function openFilterPanel() {
    filterPanel.classList.add('open');
    filterBtn.classList.add('active');
    overlay.classList.add('visible');
  }

  function closeFilterPanel() {
    filterPanel.classList.remove('open');
    filterBtn.classList.remove('active');
    overlay.classList.remove('visible');
  }

  function toggleFilterPanel() {
    if (filterPanel.classList.contains('open')) {
      closeFilterPanel();
    } else {
      openFilterPanel();
    }
  }

  function renderFilterPanel() {
    if (!filters.length) return;
    tooltip = createTooltip();
    overlay = createOverlay();

    filterPanel = document.createElement('div');
    filterPanel.className = 'deck-filter-panel';
    filterPanel.innerHTML =
      '<div class="deck-filter-header">' +
      '  <span>Filters</span>' +
      '  <button class="deck-filter-close" id="deck-filter-close">&times;</button>' +
      '</div>' +
      '<div class="deck-filter-body" id="deck-filter-body"></div>' +
      '<div class="deck-filter-footer">' +
      '  <button class="miao-reset" id="deck-filter-reset">Reset</button>' +
      '</div>';
    document.body.appendChild(filterPanel);

    document.getElementById('deck-filter-close').addEventListener('click', closeFilterPanel);

    var body = document.getElementById('deck-filter-body');
    filters.forEach(function(filter) {
      body.appendChild(filter.type === 'range' ? renderRangeFilter(filter) : renderSelectFilter(filter));
    });

    document.getElementById('deck-filter-reset').addEventListener('click', function() {
      state.filters = {};
      state.selection = null;
      state.drilldown = null;
      filterPanel.querySelectorAll('select,input').forEach(function(el) { el.value = ''; el.checked = false; });
      updateActiveSlide();
    });

    filterBtn = document.getElementById('btn-filter');
    if (filterBtn) {
      filterBtn.addEventListener('click', toggleFilterPanel);
    }

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && filterPanel.classList.contains('open')) {
        closeFilterPanel();
      }
    });
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
      input.setAttribute('list', 'miao-dk-' + md.escapeAttr(filter.field));
      var datalist = document.createElement('datalist');
      datalist.id = 'miao-dk-' + md.escapeAttr(filter.field);
      values.forEach(function(v) {
        var opt = document.createElement('option');
        opt.value = v;
        datalist.appendChild(opt);
      });
      input.addEventListener('change', function() {
        state.filters[filter.field] = input.value;
        updateActiveSlide();
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
        updateActiveSlide();
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
        updateActiveSlide();
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
          updateActiveSlide();
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
        updateActiveSlide();
      });
    });
    pair.appendChild(min);
    pair.appendChild(max);
    wrap.appendChild(label);
    wrap.appendChild(pair);
    return wrap;
  }

  function uniqueValues(field) {
    return md.uniqueValues(rows, field, 200);
  }

  function getSlideCharts(slide) {
    return slide.querySelectorAll('[data-miao-chart]');
  }

  function getChartSpec(slideIndex, chartIndex) {
    var slide = spec.slides[slideIndex];
    if (!slide || !slide.charts) return null;
    return slide.charts[chartIndex] || null;
  }

  function getActiveSlide() {
    return document.querySelector('.slide.active');
  }

  function renderChart(container, chart, sourceRows) {
    if (!chart || ['bar', 'pie', 'table'].indexOf(chart.type) === -1) return;
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
    if (chart.type === 'bar') slot.innerHTML = md.renderBar(chart, chartRows, chartId);
    else if (chart.type === 'pie') slot.innerHTML = md.renderPie(chart, chartRows, chartId);
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
      updateActiveSlide();
    };
    container.removeEventListener('click', handler);
    container.addEventListener('click', handler);
  }

  function canSelect(chart) {
    return Boolean(chart && ((chart.interaction && chart.interaction.select) || chart.drilldownPreset));
  }

  function bindMarks() {
    document.querySelectorAll('.slide.active [data-miao-mark]').forEach(function(mark) {
      var chart = getChartSpec(
        Number(mark.getAttribute('data-slide-index')),
        Number(mark.getAttribute('data-chart-index'))
      );
      mark.addEventListener('mouseenter', function(event) {
        var text = mark.getAttribute('data-tooltip');
        if (!text || !tooltip) return;
        tooltip.textContent = text;
        tooltip.hidden = false;
        moveTooltip(event);
      });
      mark.addEventListener('mousemove', moveTooltip);
      mark.addEventListener('mouseleave', function() { if (tooltip) tooltip.hidden = true; });
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
          updateActiveSlide();
          return;
        }
        if (!canSelect(chart)) return;
        state.selection = state.selection && state.selection.field === field && String(state.selection.value) === String(value)
          ? null
          : { field: field, value: value };
        updateActiveSlide();
      });
    });
  }

  function renderDrilldownBreadcrumb() {
    var activeSlide = getActiveSlide();
    if (!activeSlide) return;
    var existing = activeSlide.querySelector('.miao-drilldown-bar');
    if (!state.drilldown) {
      if (existing) existing.remove();
      return;
    }
    if (existing) existing.remove();
    var bar = document.createElement('div');
    bar.className = 'miao-drilldown-bar';
    bar.innerHTML = '<span class="miao-drilldown-label">Drilldown: </span>' +
      '<span class="miao-drilldown-chip">' + md.escapeHtml(state.drilldown.field) + ': ' + md.escapeHtml(String(state.drilldown.value)) +
      ' <button class="miao-drilldown-clear">&times;</button></span>';
    bar.querySelector('.miao-drilldown-clear').addEventListener('click', function(e) { e.stopPropagation(); state.drilldown = null; updateActiveSlide(); });
    activeSlide.insertBefore(bar, activeSlide.firstChild);
  }

  function updateActiveSlide() {
    var filtered = md.applyFilters(rows, filters, state.filters);
    var activeSlide = getActiveSlide();
    if (!activeSlide) return;

    getSlideCharts(activeSlide).forEach(function(container) {
      var slideIndex = Number(container.getAttribute('data-slide-index') || -1);
      var chartIndex = Number(container.getAttribute('data-chart-index') || 0);
      var chart = getChartSpec(slideIndex, chartIndex);
      renderChart(container, chart, filtered);
    });

    bindMarks();

    document.querySelectorAll('.slide.active [data-miao-mark]').forEach(function(mark) {
      var field = mark.getAttribute('data-field');
      var value = mark.getAttribute('data-value');
      var selected = state.selection && state.selection.field === field && String(state.selection.value) === String(value);
      mark.setAttribute('data-miao-selected', selected ? 'true' : 'false');
      mark.classList.toggle('miao-mark-hidden', Boolean((state.selection && !selected) || !markMatchesFilters(field, value)));
    });

    document.querySelectorAll('.slide.active [data-miao-chart]').forEach(function(container) {
      renderDetail(container, filtered);
    });

    renderDrilldownBreadcrumb();
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
    if (tooltip) {
      tooltip.style.left = event.clientX + 'px';
      tooltip.style.top = event.clientY + 'px';
    }
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

  function watchSlideChanges() {
    var canvas = document.querySelector('.slide-canvas');
    if (!canvas) return;
    var lastIndex = -1;
    var observer = new MutationObserver(function() {
      var active = getActiveSlide();
      if (!active) return;
      var idx = Array.prototype.indexOf.call(canvas.querySelectorAll('.slide'), active);
      if (idx === lastIndex) return;
      lastIndex = idx;
      updateActiveSlide();
    });
    observer.observe(canvas, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ['class']
    });
  }

  renderFilterPanel();
  updateActiveSlide();
  watchSlideChanges();
})();
`
