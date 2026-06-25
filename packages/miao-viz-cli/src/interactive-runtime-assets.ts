export const INTERACTIVE_CSS = `
.miao-interactive-controls { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; margin: 0 0 24px; padding: 12px 0; border-top: 1px solid rgba(128,128,128,0.18); border-bottom: 1px solid rgba(128,128,128,0.18); }
.miao-filter { display: grid; gap: 5px; font-size: 12px; }
.miao-filter label { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.56; }
.miao-filter select, .miao-filter input { min-width: 140px; border: 1px solid rgba(128,128,128,0.28); border-radius: 4px; padding: 6px 8px; background: transparent; color: inherit; font: inherit; }
.miao-filter-range { display: flex; gap: 6px; }
.miao-reset { border: 1px solid rgba(128,128,128,0.28); border-radius: 4px; padding: 7px 10px; background: transparent; color: inherit; cursor: pointer; font: inherit; }
.miao-reset:hover { background: rgba(128,128,128,0.08); }
.miao-chart-svg [data-miao-mark] { cursor: pointer; transition: opacity 0.15s ease, stroke-width 0.15s ease; }
.miao-chart-svg [data-miao-mark]:hover { opacity: 0.78; }
.miao-chart-svg [data-miao-selected="true"] { stroke: currentColor; stroke-width: 2; }
.miao-mark-hidden { opacity: 0.18; }
.miao-detail { margin-top: 12px; overflow: auto; max-height: 320px; border: 1px solid rgba(128,128,128,0.18); border-radius: 4px; }
.miao-detail-title { padding: 9px 10px; font-size: 12px; font-weight: 700; border-bottom: 1px solid rgba(128,128,128,0.18); }
.miao-detail table { width: 100%; border-collapse: collapse; font-size: 12px; }
.miao-detail th, .miao-detail td { padding: 7px 9px; border-bottom: 1px solid rgba(128,128,128,0.12); text-align: left; white-space: nowrap; }
.miao-detail th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.64; }
.miao-tooltip { position: fixed; z-index: 9999; pointer-events: none; padding: 6px 8px; border-radius: 4px; background: rgba(20,20,19,0.92); color: #fff; font: 12px/1.35 system-ui, sans-serif; box-shadow: 0 8px 24px rgba(0,0,0,0.18); transform: translate(10px, 10px); }
`

export const INTERACTIVE_JS = `
(function() {
  var specEl = document.getElementById('miao-viz-spec');
  var dataEl = document.getElementById('miao-viz-data');
  if (!specEl || !dataEl) return;

  var spec = JSON.parse(specEl.textContent || '{}');
  var rows = JSON.parse(dataEl.textContent || '[]');
  var filters = (spec.interactions && spec.interactions.globalFilters) || [];
  var state = { filters: {}, selection: null };
  var tooltip = createTooltip();

  function init() {
    renderControls();
    update();
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
      controls.querySelectorAll('select,input').forEach(function(input) { input.value = ''; });
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
    var select = document.createElement('select');
    select.innerHTML = '<option value="">All</option>' + uniqueValues(filter.field).map(function(value) {
      return '<option value="' + escapeAttr(value) + '">' + escapeHtml(value) + '</option>';
    }).join('');
    select.addEventListener('change', function() {
      state.filters[filter.field] = select.value;
      update();
    });
    wrap.appendChild(label);
    wrap.appendChild(select);
    return wrap;
  }

  function renderRangeFilter(filter) {
    var wrap = document.createElement('div');
    wrap.className = 'miao-filter';
    var label = document.createElement('label');
    label.textContent = filter.field;
    var pair = document.createElement('div');
    pair.className = 'miao-filter-range';
    var min = document.createElement('input');
    var max = document.createElement('input');
    min.placeholder = 'Min';
    max.placeholder = 'Max';
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

  function bindMarks() {
    document.querySelectorAll('[data-miao-mark]').forEach(function(mark) {
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
        if (!canSelect(chart)) return;
        var field = mark.getAttribute('data-field');
        var value = mark.getAttribute('data-value');
        if (!field) return;
        state.selection = state.selection && state.selection.field === field && String(state.selection.value) === String(value)
          ? null
          : { field: field, value: value };
        update();
      });
    });
  }

  function update() {
    var filtered = applyFilters(rows);
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
    document.querySelectorAll('[data-miao-chart]').forEach(function(chart) {
      renderDetail(chart, filtered);
    });
  }

  function renderChart(container, chart, sourceRows) {
    if (!chart || ['bar', 'pie', 'table'].indexOf(chart.type) === -1) return;
    var slot = container.querySelector('.miao-render-slot');
    if (!slot) return;
    var chartRows = prepareRows(sourceRows, chart);
    if (chart.type === 'bar') slot.innerHTML = renderBar(chart, chartRows, container.getAttribute('data-miao-chart'));
    else if (chart.type === 'pie') slot.innerHTML = renderPie(chart, chartRows, container.getAttribute('data-miao-chart'));
    else if (chart.type === 'table') slot.innerHTML = renderTable(chart, chartRows, container.getAttribute('data-miao-chart'));
  }

  function prepareRows(sourceRows, chart) {
    return ((chart.data && chart.data.transform) || []).reduce(function(current, transform) {
      if (transform.type === 'derive-month' && transform.field && transform.as) {
        return current.map(function(row) {
          var copy = Object.assign({}, row);
          copy[transform.as] = toMonth(row[transform.field]);
          return copy;
        });
      }
      if (transform.type === 'aggregate') return aggregateRows(current, transform);
      if (transform.type === 'sort' && transform.field) {
        var order = transform.order === 'asc' ? 1 : -1;
        return current.slice().sort(function(a, b) {
          var an = Number(a[transform.field]);
          var bn = Number(b[transform.field]);
          if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * order;
          return String(a[transform.field] || '').localeCompare(String(b[transform.field] || '')) * order;
        });
      }
      if (transform.type === 'limit' && typeof transform.value === 'number') return current.slice(0, transform.value);
      return current;
    }, sourceRows.slice());
  }

  function aggregateRows(sourceRows, transform) {
    var groupBy = transform.groupBy || [];
    var measures = transform.measures || [];
    var groups = new Map();
    sourceRows.forEach(function(row) {
      var key = JSON.stringify(groupBy.map(function(field) { return row[field]; }));
      var existing = groups.get(key) || [];
      existing.push(row);
      groups.set(key, existing);
    });
    return Array.from(groups.values()).map(function(groupRows) {
      var first = groupRows[0] || {};
      var out = {};
      groupBy.forEach(function(field) { out[field] = first[field]; });
      measures.forEach(function(measure) { out[measure.as] = aggregateMeasure(groupRows, measure); });
      return out;
    });
  }

  function aggregateMeasure(sourceRows, measure) {
    if (measure.op === 'count') return sourceRows.length;
    var values = sourceRows.map(function(row) { return Number(row[measure.field]); }).filter(Number.isFinite);
    if (!values.length) return 0;
    if (measure.op === 'avg') return values.reduce(sum, 0) / values.length;
    if (measure.op === 'min') return Math.min.apply(null, values);
    if (measure.op === 'max') return Math.max.apply(null, values);
    return values.reduce(sum, 0);
  }

  function renderBar(chart, chartRows, chartId) {
    var xField = field(chart, 'x');
    var yField = field(chart, 'y');
    var width = numberStyle(chart, 'width', 720);
    var height = numberStyle(chart, 'height', 420);
    var margin = { top: 24, right: 24, bottom: 48, left: 72 };
    var chartWidth = width - margin.left - margin.right;
    var chartHeight = height - margin.top - margin.bottom;
    var values = chartRows.map(function(row) { return Number(row[yField]); }).filter(Number.isFinite);
    var yMax = Math.max.apply(null, values.concat([1]));
    var gap = 8;
    var barWidth = Math.max(8, (chartWidth - gap * Math.max(chartRows.length - 1, 0)) / Math.max(chartRows.length, 1));
    var body = chartRows.map(function(row, index) {
      var value = Number(row[yField]) || 0;
      var barHeight = value / yMax * chartHeight;
      var x = margin.left + index * (barWidth + gap);
      var y = margin.top + chartHeight - barHeight;
      var label = String(row[xField] == null ? '' : row[xField]);
      return '<g><rect ' + markAttrs(chartId, xField, row[xField], index, label + ': ' + value) +
        ' x="' + fixed(x) + '" y="' + fixed(y) + '" width="' + fixed(barWidth) + '" height="' + fixed(barHeight) +
        '" rx="3" fill="' + color(index) + '" />' +
        '<text x="' + fixed(x + barWidth / 2) + '" y="' + fixed(margin.top + chartHeight + 18) +
        '" text-anchor="middle" fill="#475569" font-size="11">' + escapeHtml(label) + '</text></g>';
    }).join('');
    return svgFrame(width, height, body);
  }

  function renderPie(chart, chartRows, chartId) {
    var labelField = field(chart, 'label');
    var valueField = field(chart, 'value');
    var width = numberStyle(chart, 'width', 720);
    var height = numberStyle(chart, 'height', 420);
    var cx = width / 2 - 80;
    var cy = height / 2;
    var radius = Math.min(width, height) * 0.34;
    var values = chartRows.map(function(row) { return Math.max(0, Number(row[valueField]) || 0); });
    var total = values.reduce(sum, 0) || 1;
    var angle = -Math.PI / 2;
    var slices = chartRows.map(function(row, index) {
      var value = values[index];
      var nextAngle = angle + value / total * Math.PI * 2;
      var path = describeArc(cx, cy, radius, angle, nextAngle);
      var label = String(row[labelField] == null ? '' : row[labelField]);
      angle = nextAngle;
      return '<path ' + markAttrs(chartId, labelField, row[labelField], index, label + ': ' + value) +
        ' d="' + path + '" fill="' + color(index) + '" stroke="#fff" stroke-width="2" />';
    }).join('');
    return svgFrame(width, height, slices);
  }

  function renderTable(chart, chartRows, chartId) {
    var columns = Object.keys(chartRows[0] || rows[0] || {}).slice(0, 8);
    var markField = field(chart, 'label') || field(chart, 'x') || columns[0] || '';
    return '<div class="miao-table-wrap"><table class="miao-table"><thead><tr>' +
      columns.map(function(col) { return '<th>' + escapeHtml(col) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + chartRows.slice(0, 20).map(function(row, index) {
        return '<tr ' + markAttrs(chartId, markField, row[markField], index, String(row[markField] || 'Row')) + '>' +
          columns.map(function(col) { return '<td>' + escapeHtml(row[col] == null ? '' : row[col]) + '</td>'; }).join('') +
          '</tr>';
      }).join('') + '</tbody></table></div>';
  }

  function renderDetail(chart, filtered) {
    var chartId = chart.getAttribute('data-miao-chart');
    var detail = chart.querySelector('.miao-detail');
    if (!detail) {
      detail = document.createElement('div');
      detail.className = 'miao-detail';
      chart.appendChild(detail);
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
    detail.innerHTML = detailTable(selectedRows, chartId);
  }

  function applyFilters(source) {
    return source.filter(function(row) {
      return filters.every(function(filter) {
        var active = state.filters[filter.field];
        if (active == null || active === '' || (Array.isArray(active) && !active[0] && !active[1])) return true;
        if (filter.type === 'select') return String(row[filter.field] == null ? '' : row[filter.field]) === String(active);
        var current = comparable(row[filter.field]);
        if (current == null) return false;
        var min = comparable(active[0]);
        var max = comparable(active[1]);
        if (min != null && current < min) return false;
        if (max != null && current > max) return false;
        return true;
      });
    });
  }

  function markMatchesFilters(field, value) {
    var activeFilters = filters.filter(function(filter) { return filter.field === field; });
    if (!activeFilters.length) return true;
    return activeFilters.every(function(filter) {
      var active = state.filters[filter.field];
      if (active == null || active === '' || (Array.isArray(active) && !active[0] && !active[1])) return true;
      if (filter.type === 'select') return String(value == null ? '' : value) === String(active);
      var current = comparable(value);
      if (current == null) return false;
      var min = comparable(active[0]);
      var max = comparable(active[1]);
      if (min != null && current < min) return false;
      if (max != null && current > max) return false;
      return true;
    });
  }

  function chartSpec(chartId) {
    return (spec.charts || []).find(function(chart, index) { return (chart.id || ('chart-' + (index + 1))) === chartId; }) || null;
  }
  function canSelect(chart) { return Boolean(chart && ((chart.interaction && chart.interaction.select) || chart.drilldownPreset)); }
  function field(chart, channel) { return chart && chart.encoding && chart.encoding[channel] ? chart.encoding[channel].field : ''; }
  function numberStyle(chart, key, fallback) { return chart && chart.style && typeof chart.style[key] === 'number' ? chart.style[key] : fallback; }

  function svgFrame(width, height, body) {
    return '<svg class="miao-chart-svg" viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="' + height +
      '" role="img" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="' + width + '" height="' + height +
      '" fill="#fff" />' + body + '</svg>';
  }

  function markAttrs(chartId, markField, value, rowKey, tooltipText) {
    return 'data-miao-mark="true" data-chart-id="' + escapeAttr(chartId || '') + '" data-field="' + escapeAttr(markField || '') +
      '" data-value="' + escapeAttr(value == null ? '' : value) + '" data-row-key="' + escapeAttr(rowKey) +
      '" data-tooltip="' + escapeAttr(tooltipText || '') + '"';
  }

  function describeArc(cx, cy, radius, startAngle, endAngle) {
    var start = polarToCartesian(cx, cy, radius, endAngle);
    var end = polarToCartesian(cx, cy, radius, startAngle);
    var largeArc = endAngle - startAngle <= Math.PI ? '0' : '1';
    return 'M ' + fixed(cx) + ' ' + fixed(cy) + ' L ' + fixed(start.x) + ' ' + fixed(start.y) +
      ' A ' + fixed(radius) + ' ' + fixed(radius) + ' 0 ' + largeArc + ' 0 ' + fixed(end.x) + ' ' + fixed(end.y) + ' Z';
  }

  function polarToCartesian(cx, cy, radius, angle) { return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) }; }
  function toMonth(value) {
    var date = new Date(String(value));
    if (!Number.isFinite(date.getTime())) return String(value == null ? '' : value);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }
  function color(index) { var palette = ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#7c3aed', '#0891b2']; return palette[index % palette.length]; }
  function fixed(value) { return Number(value).toFixed(1); }
  function sum(a, b) { return a + b; }

  function detailTable(selectedRows, chartId) {
    var visible = selectedRows.slice(0, 100);
    var columns = Object.keys(visible[0] || rows[0] || {}).slice(0, 8);
    if (!columns.length) return '<div class="miao-detail-title">No rows</div>';
    return '<div class="miao-detail-title">' + escapeHtml(chartId || 'Detail') + ': ' + selectedRows.length + ' rows</div>' +
      '<table><thead><tr>' + columns.map(function(col) { return '<th>' + escapeHtml(col) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + visible.map(function(row) {
        return '<tr>' + columns.map(function(col) { return '<td>' + escapeHtml(row[col] == null ? '' : row[col]) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
  }

  function uniqueValues(field) {
    var seen = new Set();
    rows.forEach(function(row) {
      if (row[field] != null) seen.add(String(row[field]));
    });
    return Array.from(seen).slice(0, 200).sort();
  }

  function comparable(value) {
    if (value == null || value === '') return null;
    var number = Number(value);
    if (Number.isFinite(number)) return number;
    var date = new Date(String(value)).getTime();
    return Number.isFinite(date) ? date : null;
  }

  function createTooltip() {
    var el = document.createElement('div');
    el.className = 'miao-tooltip';
    el.hidden = true;
    document.body.appendChild(el);
    return el;
  }

  function moveTooltip(event) {
    tooltip.style.left = event.clientX + 'px';
    tooltip.style.top = event.clientY + 'px';
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function(char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/\\n/g, ' ');
  }

  init();
})();
`
