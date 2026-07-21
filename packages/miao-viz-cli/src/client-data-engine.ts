export const CLIENT_DATA_ENGINE_CSS = `
.miao-chart-svg [data-miao-mark] { cursor: pointer; transition: opacity 0.15s ease, stroke-width 0.15s ease; }
.miao-chart-svg [data-miao-mark]:hover { opacity: 0.78; }
.miao-chart-svg [data-miao-selected="true"] { stroke: currentColor; stroke-width: 2; }
.miao-mark-hidden { opacity: 0.18; }
.miao-table th[data-sortable] { cursor: pointer; user-select: none; }
.miao-table th[data-sortable]:hover { opacity: 0.72; }
.miao-filter-checks { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 4px; }
.miao-filter-checks-scroll { max-height: 200px; overflow-y: auto; }
.miao-chip { display: inline-flex; align-items: center; gap: 4px; padding: 4px 8px; border: 1px solid rgba(128,128,128,0.28); border-radius: 4px; font-size: 12px; cursor: pointer; }
.miao-chip:hover { background: rgba(128,128,128,0.06); }
.miao-chip input[type="checkbox"] { margin: 0; }
.miao-filter-search { min-width: 180px; border: 1px solid rgba(128,128,128,0.28); border-radius: 4px; padding: 6px 8px; background: transparent; color: inherit; font: inherit; }
.miao-drilldown-bar { display: flex; align-items: center; gap: 8px; margin: 0 0 16px; padding: 8px 12px; border-radius: 4px; background: rgba(128,128,128,0.06); border: 1px solid rgba(128,128,128,0.18); font-size: 12px; }
.miao-drilldown-label { font-size: 10px; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.5; }
.miao-drilldown-chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 4px; background: rgba(37,99,235,0.1); color: #2563eb; font-weight: 600; }
.miao-drilldown-clear { background: none; border: none; cursor: pointer; font-size: 14px; color: inherit; padding: 0 2px; line-height: 1; }
.miao-drilldown-clear:hover { opacity: 0.7; }
.miao-detail { margin-top: 12px; overflow: auto; max-height: 320px; border: 1px solid rgba(128,128,128,0.18); border-radius: 4px; }
.miao-detail-title { padding: 9px 10px; font-size: 12px; font-weight: 700; border-bottom: 1px solid rgba(128,128,128,0.18); }
.miao-detail table { width: 100%; border-collapse: collapse; font-size: 12px; }
.miao-detail th, .miao-detail td { padding: 7px 9px; border-bottom: 1px solid rgba(128,128,128,0.12); text-align: left; white-space: nowrap; }
.miao-detail th { font-size: 10px; text-transform: uppercase; letter-spacing: 0.06em; opacity: 0.64; }
.miao-tooltip { position: fixed; z-index: 9999; pointer-events: none; padding: 6px 8px; border-radius: 4px; background: rgba(20,20,19,0.92); color: #fff; font: 12px/1.35 system-ui, sans-serif; box-shadow: 0 8px 24px rgba(0,0,0,0.18); transform: translate(10px, 10px); }
.miao-view-state { display:flex; flex-wrap:wrap; align-items:center; gap:8px; margin:0 0 16px; padding:8px 12px; border:1px solid rgba(128,128,128,.18); border-radius:4px; font-size:11px; }
.miao-view-state button { border:0; background:transparent; color:inherit; cursor:pointer; text-decoration:underline; }
.miao-no-data { display:grid; place-items:center; min-height:180px; color:#64748b; font:13px system-ui,sans-serif; border:1px dashed rgba(128,128,128,.25); border-radius:4px; }
.miao-view-derived { font-size:10px; text-transform:uppercase; letter-spacing:.06em; opacity:.55; }
[data-view-scope="base-evidence"]::after { content:'Based on full dataset'; display:block; margin-top:6px; font-size:10px; text-transform:uppercase; letter-spacing:.06em; opacity:.5; }
@media print { .miao-interactive-controls,.deck-filter-btn,.deck-filter-panel,.deck-overlay,.miao-view-state,.miao-drilldown-bar { display:none !important; } }
`

export const CLIENT_DATA_ENGINE_JS = `
(function() {
  var miaoData = {};
  var palette = ['#2563eb', '#16a34a', '#f97316', '#dc2626', '#7c3aed', '#0891b2'];

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, function(char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/\\\\n/g, ' ');
  }

  function sum(a, b) { return a + b; }
  function fixed(value) { return Number(value).toFixed(1); }

  function toMonth(value) {
    var date = new Date(String(value));
    if (!Number.isFinite(date.getTime())) return String(value == null ? '' : value);
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0');
  }

  function color(index) { return palette[index % palette.length]; }

  function comparableValue(value) {
    if (value == null || value === '') return null;
    var num = Number(value);
    if (Number.isFinite(num)) return num;
    var date = new Date(String(value)).getTime();
    return Number.isFinite(date) ? date : null;
  }

  function svgFrame(width, height, body) {
    return '<svg class="miao-chart-svg" viewBox="0 0 ' + width + ' ' + height + '" width="100%" height="' + height +
      '" role="img" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="' + width + '" height="' + height +
      '" fill="#fff" />' + body + '</svg>';
  }

  function markAttrs(chartId, markField, value, rowKey, tooltipText) {
    return 'data-miao-mark="true" data-chart-id="' + escapeAttr(chartId || '') + '" data-field="' + escapeAttr(markField || '') +
      '" data-value="' + escapeAttr(value == null ? '' : String(value)) + '" data-row-key="' + escapeAttr(String(rowKey)) +
      '" data-tooltip="' + escapeAttr(tooltipText || '') + '"';
  }

  function polarToCartesian(cx, cy, radius, angle) {
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  }

  function describeArc(cx, cy, radius, startAngle, endAngle) {
    var start = polarToCartesian(cx, cy, radius, endAngle);
    var end = polarToCartesian(cx, cy, radius, startAngle);
    var largeArc = endAngle - startAngle <= Math.PI ? '0' : '1';
    return 'M ' + fixed(cx) + ' ' + fixed(cy) + ' L ' + fixed(start.x) + ' ' + fixed(start.y) +
      ' A ' + fixed(radius) + ' ' + fixed(radius) + ' 0 ' + largeArc + ' 0 ' + fixed(end.x) + ' ' + fixed(end.y) + ' Z';
  }

  miaoData.escapeHtml = escapeHtml;
  miaoData.escapeAttr = escapeAttr;
  miaoData.fixed = fixed;
  miaoData.sum = sum;
  miaoData.toMonth = toMonth;
  miaoData.color = color;
  miaoData.comparableValue = comparableValue;
  miaoData.svgFrame = svgFrame;
  miaoData.markAttrs = markAttrs;
  miaoData.describeArc = describeArc;
  miaoData.polarToCartesian = polarToCartesian;

  miaoData.uniqueValues = function(rows, field, limit) {
    var seen = new Set();
    rows.forEach(function(row) {
      if (row[field] != null) seen.add(String(row[field]));
    });
    return Array.from(seen).slice(0, limit || 200).sort();
  };

  miaoData.aggregateMeasure = function(sourceRows, measure) {
    if (measure.op === 'count') return sourceRows.length;
    var values = sourceRows.map(function(row) { return Number(row[measure.field]); }).filter(Number.isFinite);
    if (!values.length) return 0;
    if (measure.op === 'avg') return values.reduce(sum, 0) / values.length;
    if (measure.op === 'min') return Math.min.apply(null, values);
    if (measure.op === 'max') return Math.max.apply(null, values);
    return values.reduce(sum, 0);
  };

  miaoData.aggregateRows = function(sourceRows, transform) {
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
      measures.forEach(function(measure) { out[measure.as] = miaoData.aggregateMeasure(groupRows, measure); });
      return out;
    });
  };

  miaoData.prepareRows = function(sourceRows, chart) {
    return ((chart.data && chart.data.transform) || []).reduce(function(current, transform) {
      if (transform.type === 'derive-month' && transform.field && transform.as) {
        return current.map(function(row) {
          var copy = Object.assign({}, row);
          copy[transform.as] = miaoData.toMonth(row[transform.field]);
          return copy;
        });
      }
      if (transform.type === 'aggregate') return miaoData.aggregateRows(current, transform);
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
      if (transform.type === 'filter' && transform.field && transform.value != null) {
        var rawStr = String(transform.value);
        var ops = ['>=', '<=', '>', '<', '='];
        var op = '=';
        var compVal = rawStr;
        for (var oi = 0; oi < ops.length; oi++) {
          if (rawStr.indexOf(ops[oi]) === 0) { op = ops[oi]; compVal = rawStr.slice(ops[oi].length).trim(); break; }
        }
        return current.filter(function(row) {
          var cell = String(row[transform.field] == null ? '' : row[transform.field]);
          if (op === '=') return cell === compVal;
          var numCell = Number(row[transform.field]);
          var numComp = Number(compVal);
          if (Number.isFinite(numCell) && Number.isFinite(numComp)) {
            if (op === '>=') return numCell >= numComp;
            if (op === '<=') return numCell <= numComp;
            if (op === '>') return numCell > numComp;
            if (op === '<') return numCell < numComp;
          }
          if (op === '>=') return cell >= compVal;
          if (op === '<=') return cell <= compVal;
          if (op === '>') return cell > compVal;
          if (op === '<') return cell < compVal;
          return false;
        });
      }
      return current;
    }, sourceRows.slice());
  };

  miaoData.applyFilters = function(source, filterDefs, state) {
    return source.filter(function(row) {
      return filterDefs.every(function(filter) {
        var active = state[filter.field];
        if (active == null || active === '' || (Array.isArray(active) && !active[0] && !active[1])) return true;
        if (filter.type === 'select') {
          if (Array.isArray(active)) {
            if (active.length === 0) return true;
            return active.indexOf(String(row[filter.field] == null ? '' : row[filter.field])) !== -1;
          }
          return String(row[filter.field] == null ? '' : row[filter.field]) === String(active);
        }
        var current = miaoData.comparableValue(row[filter.field]);
        if (current == null) return false;
        var min = miaoData.comparableValue(active[0]);
        var max = miaoData.comparableValue(active[1]);
        if (min != null && current < min) return false;
        if (max != null && current > max) return false;
        return true;
      });
    });
  };

  miaoData.guessFieldType = function(rows, field) {
    var count = 0, dateCount = 0, numCount = 0;
    for (var i = 0; i < rows.length && count < 10; i++) {
      var v = rows[i][field];
      if (v == null || v === '') continue;
      count++;
      if (Number.isFinite(Number(v))) numCount++;
      if (!isNaN(Date.parse(String(v)))) dateCount++;
    }
    if (count === 0) return 'string';
    if (dateCount >= count * 0.8) return 'date';
    if (numCount >= count * 0.8) return 'number';
    return 'string';
  };

  miaoData.renderLegend = function(svgWidth, marginTop, colorValues) {
    var legendX = svgWidth - 200;
    return colorValues.map(function(val, i) {
      var y = marginTop + i * 20;
      return '<g><rect x="' + legendX + '" y="' + (y - 8) + '" width="10" height="10" rx="2" fill="' + color(i) +
        '" /><text x="' + (legendX + 16) + '" y="' + y + '" fill="#475569" font-size="11">' + escapeHtml(val.substring(0, 16)) + '</text></g>';
    }).join('');
  };

  miaoData.describeDonutArc = function(cx, cy, innerR, outerR, startAngle, endAngle) {
    var outerS = miaoData.polarToCartesian(cx, cy, outerR, startAngle);
    var outerE = miaoData.polarToCartesian(cx, cy, outerR, endAngle);
    var innerS = miaoData.polarToCartesian(cx, cy, innerR, endAngle);
    var innerE = miaoData.polarToCartesian(cx, cy, innerR, startAngle);
    var largeArc = endAngle - startAngle <= Math.PI ? '0' : '1';
    return 'M ' + fixed(outerS.x) + ' ' + fixed(outerS.y) +
      ' A ' + fixed(outerR) + ' ' + fixed(outerR) + ' 0 ' + largeArc + ' 0 ' + fixed(outerE.x) + ' ' + fixed(outerE.y) +
      ' L ' + fixed(innerS.x) + ' ' + fixed(innerS.y) +
      ' A ' + fixed(innerR) + ' ' + fixed(innerR) + ' 0 ' + largeArc + ' 1 ' + fixed(innerE.x) + ' ' + fixed(innerE.y) + ' Z';
  };

  miaoData.renderBar = function(chart, chartRows, chartId) {
    var xField = (chart.encoding && chart.encoding.x && chart.encoding.x.field) || '';
    var yField = (chart.encoding && chart.encoding.y && chart.encoding.y.field) || '';
    var colorField = (chart.encoding && chart.encoding.color && chart.encoding.color.field) || '';
    var width = (chart.style && typeof chart.style.width === 'number') ? chart.style.width : 720;
    var height = (chart.style && typeof chart.style.height === 'number') ? chart.style.height : 420;
    var margin = { top: 24, right: 24, bottom: 48, left: 72 };
    var chartWidth = width - margin.left - margin.right;
    var chartHeight = height - margin.top - margin.bottom;
    var values = chartRows.map(function(row) { return Number(row[yField]); }).filter(Number.isFinite);
    var yMax = Math.max.apply(null, values.concat([1]));
    var gap = 8;

    if (!colorField) {
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

    var colorValues = miaoData.uniqueValues(chartRows, colorField);
    var xValues = miaoData.uniqueValues(chartRows, xField);
    var rowMap = new Map();
    chartRows.forEach(function(row) {
      rowMap.set(String(row[xField]) + '|' + String(row[colorField]), Number(row[yField]) || 0);
    });
    var barMode = chart.style && chart.style.barMode;
    var stackColors = colorValues.map(function(_, ci) { return color(ci); });

    if (barMode === 'stacked') {
      var xBarWidth = Math.max(8, (chartWidth - gap * Math.max(xValues.length - 1, 0)) / Math.max(xValues.length, 1));
      var body = xValues.map(function(xVal, xi) {
        var accumY = 0;
        return colorValues.map(function(cVal, ci) {
          var raw = rowMap.get(String(xVal) + '|' + String(cVal)) || 0;
          var barHeight = raw / yMax * chartHeight;
          var x = margin.left + xi * (xBarWidth + gap);
          var y = margin.top + chartHeight - accumY - barHeight;
          accumY += barHeight;
          return '<rect ' + markAttrs(chartId, xField, xVal, xi * colorValues.length + ci, xVal + ', ' + cVal + ': ' + raw) +
            ' x="' + fixed(x) + '" y="' + fixed(y) + '" width="' + fixed(xBarWidth) + '" height="' + fixed(barHeight) +
            '" rx="1" fill="' + stackColors[ci] + '" />';
        }).join('');
      }).join('');
      return svgFrame(width, height, body + miaoData.renderLegend(width, margin.top, colorValues));
    }

    var groupWidth = (chartWidth - gap * Math.max(xValues.length - 1, 0)) / Math.max(xValues.length, 1);
    var barWidth = Math.max(4, (groupWidth - gap * Math.max(colorValues.length - 1, 0)) / Math.max(colorValues.length, 1));
    var groupStartX = (groupWidth - (barWidth * colorValues.length + gap * Math.max(colorValues.length - 1, 0))) / 2;
    var xLabels = [];

    var body = xValues.map(function(xVal, xi) {
      var baseX = margin.left + xi * (groupWidth + gap) + groupStartX;
      xLabels.push('<text x="' + fixed(baseX + groupWidth / 2 - gap / 2) + '" y="' + fixed(margin.top + chartHeight + 18) +
        '" text-anchor="middle" fill="#475569" font-size="11">' + escapeHtml(xVal.substring(0, 12)) + '</text>');
      return colorValues.map(function(cVal, ci) {
        var raw = rowMap.get(String(xVal) + '|' + String(cVal)) || 0;
        var barHeight = raw / yMax * chartHeight;
        var x = baseX + ci * (barWidth + gap);
        var y = margin.top + chartHeight - barHeight;
        return '<rect ' + markAttrs(chartId, xField, xVal, xi * colorValues.length + ci, xVal + ', ' + cVal + ': ' + raw) +
          ' x="' + fixed(x) + '" y="' + fixed(y) + '" width="' + fixed(barWidth) + '" height="' + fixed(barHeight) +
          '" rx="2" fill="' + stackColors[ci] + '" />';
      }).join('');
    }).join('');

    return svgFrame(width, height, body + xLabels.join('') + miaoData.renderLegend(width, margin.top, colorValues));
  };

  miaoData.renderXY = function(chart, chartRows, chartId) {
    var xField = (chart.encoding && chart.encoding.x && chart.encoding.x.field) || '';
    var yField = (chart.encoding && chart.encoding.y && chart.encoding.y.field) || '';
    var width = (chart.style && typeof chart.style.width === 'number') ? chart.style.width : 720;
    var height = (chart.style && typeof chart.style.height === 'number') ? chart.style.height : 420;
    var margin = { top: 24, right: 24, bottom: 48, left: 64 };
    var w = width - margin.left - margin.right, h = height - margin.top - margin.bottom;
    var values = chartRows.map(function(row) { return Number(row[yField]); }).filter(Number.isFinite);
    if (!values.length) return miaoData.renderNoData();
    var min = Math.min.apply(null, values), max = Math.max.apply(null, values);
    if (min === max) { min = Math.min(0, min); max = max || 1; }
    var points = chartRows.map(function(row, index) {
      var x = margin.left + (chartRows.length <= 1 ? w / 2 : index / (chartRows.length - 1) * w);
      var value = Number(row[yField]);
      var y = margin.top + h - ((value - min) / (max - min || 1) * h);
      return { x:x, y:y, row:row, index:index, value:value };
    }).filter(function(point) { return Number.isFinite(point.value); });
    var line = points.map(function(point, index) { return (index ? 'L ' : 'M ') + fixed(point.x) + ' ' + fixed(point.y); }).join(' ');
    var body = '';
    if (chart.type === 'area' && points.length) body += '<path d="' + line + ' L ' + fixed(points[points.length-1].x) + ' ' + fixed(margin.top+h) + ' L ' + fixed(points[0].x) + ' ' + fixed(margin.top+h) + ' Z" fill="' + color(0) + '" opacity=".18" />';
    if (chart.type !== 'scatter') body += '<path d="' + line + '" fill="none" stroke="' + color(0) + '" stroke-width="3" />';
    body += points.map(function(point) { var label=String(point.row[xField] == null ? '' : point.row[xField]); return '<circle ' + markAttrs(chartId,xField,point.row[xField],point.index,label+': '+point.value) + ' cx="'+fixed(point.x)+'" cy="'+fixed(point.y)+'" r="5" fill="'+color(0)+'" />'; }).join('');
    return svgFrame(width,height,body);
  };

  miaoData.renderBigValue = function(chart, chartRows) {
    var field = (chart.encoding && chart.encoding.value && chart.encoding.value.field) || '';
    var value = chartRows[0] && chartRows[0][field];
    return '<div class="miao-bigvalue"><div style="font-size:42px;font-weight:700">' + escapeHtml(value == null ? '—' : String(value)) + '</div><div class="miao-view-derived">Current filter</div></div>';
  };

  miaoData.renderNoData = function() { return '<div class="miao-no-data">No data for the current view</div>'; };

  miaoData.renderPie = function(chart, chartRows, chartId) {
    var labelField = (chart.encoding && chart.encoding.label && chart.encoding.label.field) || '';
    var valueField = (chart.encoding && chart.encoding.value && chart.encoding.value.field) || '';
    var width = (chart.style && typeof chart.style.width === 'number') ? chart.style.width : 720;
    var height = (chart.style && typeof chart.style.height === 'number') ? chart.style.height : 420;
    var cx = width / 2 - 80;
    var cy = height / 2;
    var outerR = Math.min(width, height) * 0.34;
    var innerR = (chart.style && typeof chart.style.innerRadius === 'number' ? chart.style.innerRadius : 0) * outerR;
    var values = chartRows.map(function(row) { return Math.max(0, Number(row[valueField]) || 0); });
    var total = values.reduce(sum, 0) || 1;
    var angle = -Math.PI / 2;
    var slices = chartRows.map(function(row, index) {
      var value = values[index];
      var nextAngle = angle + value / total * Math.PI * 2;
      var path = innerR > 0
        ? miaoData.describeDonutArc(cx, cy, innerR, outerR, angle, nextAngle)
        : describeArc(cx, cy, outerR, angle, nextAngle);
      var label = String(row[labelField] == null ? '' : row[labelField]);
      angle = nextAngle;
      return '<path ' + markAttrs(chartId, labelField, row[labelField], index, label + ': ' + value) +
        ' d="' + path + '" fill="' + color(index) + '" stroke="#fff" stroke-width="2" />';
    }).join('');
    return svgFrame(width, height, slices);
  };

  miaoData.renderTable = function(chart, chartRows, chartId, sortState) {
    var sortable = chart.sortable === true;

    if (sortState && sortState.field && sortState.order) {
      var order = sortState.order === 'asc' ? 1 : -1;
      chartRows = chartRows.slice().sort(function(a, b) {
        var an = Number(a[sortState.field]);
        var bn = Number(b[sortState.field]);
        if (Number.isFinite(an) && Number.isFinite(bn)) return (an - bn) * order;
        return String(a[sortState.field] || '').localeCompare(String(b[sortState.field] || '')) * order;
      });
    }

    var columns = Object.keys(chartRows[0] || {}).slice(0, 8);
    var markField = (chart.encoding && chart.encoding.label && chart.encoding.label.field) ||
      (chart.encoding && chart.encoding.x && chart.encoding.x.field) || columns[0] || '';
    var thead = '<thead><tr>' +
      columns.map(function(col) {
        var attrs = '';
        var indicator = '';
        if (sortable) {
          var active = sortState && sortState.field === col;
          var order = active ? sortState.order : '';
          attrs = ' data-sortable="true" data-sort-field="' + escapeAttr(col) + '" data-sort-order="' + order + '"';
          indicator = active ? (order === 'asc' ? ' \u25B2' : ' \u25BC') : '';
        }
        return '<th' + attrs + '>' + escapeHtml(col) + indicator + '</th>';
      }).join('') +
      '</tr></thead>';
    var tbody = '<tbody>' + chartRows.slice(0, 20).map(function(row, index) {
      return '<tr ' + markAttrs(chartId, markField, row[markField], index, String(row[markField] || 'Row')) + '>' +
        columns.map(function(col) { return '<td>' + escapeHtml(row[col] == null ? '' : String(row[col])) + '</td>'; }).join('') +
        '</tr>';
    }).join('') + '</tbody>';
    return '<div class="miao-table-wrap"><table class="miao-table">' + thead + tbody + '</table></div>';
  };

  miaoData.renderDetailTable = function(selectedRows, chartId, allRows) {
    var visible = selectedRows.slice(0, 100);
    var columns = Object.keys(visible[0] || allRows[0] || {}).slice(0, 8);
    if (!columns.length) return '<div class="miao-detail-title">No rows</div>';
    return '<div class="miao-detail-title">' + escapeHtml(chartId || 'Detail') + ': ' + selectedRows.length + ' rows</div>' +
      '<table><thead><tr>' + columns.map(function(col) { return '<th>' + escapeHtml(col) + '</th>'; }).join('') +
      '</tr></thead><tbody>' + visible.map(function(row) {
        return '<tr>' + columns.map(function(col) { return '<td>' + escapeHtml(row[col] == null ? '' : String(row[col])) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table>';
  };

  window.miaoData = miaoData;
})();
`
