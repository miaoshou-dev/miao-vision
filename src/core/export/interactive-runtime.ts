/**
 * Interactive Runtime for Exported Reports
 *
 * A lightweight JavaScript runtime that provides interactivity
 * for exported HTML reports without requiring the full application.
 *
 * Features:
 * - Table sorting and filtering
 * - Input controls (dropdown, button group)
 * - Cross-component filtering via inputs
 *
 * @module core/export/interactive-runtime
 */

/**
 * Generate the interactive runtime script
 * This is embedded into exported HTML files
 */
export function generateInteractiveRuntime(): string {
  return `
(function() {
  'use strict';

  // ============================================
  // State Management
  // ============================================
  const state = {
    inputs: {},
    data: {},
    listeners: []
  };

  window.MiaoVision = {
    state,
    setInput,
    getInput,
    registerData,
    getData,
    subscribe,
    filterTable,
    sortTable
  };

  function setInput(name, value) {
    const oldValue = state.inputs[name];
    state.inputs[name] = value;
    if (oldValue !== value) {
      notifyListeners({ type: 'input', name, value, oldValue });
      updateDependentComponents(name);
    }
  }

  function getInput(name) {
    return state.inputs[name];
  }

  function registerData(name, data) {
    state.data[name] = data;
  }

  function getData(name) {
    return state.data[name] || [];
  }

  function subscribe(callback) {
    state.listeners.push(callback);
    return () => {
      state.listeners = state.listeners.filter(l => l !== callback);
    };
  }

  function notifyListeners(event) {
    state.listeners.forEach(fn => {
      try { fn(event); } catch (e) { console.error('Listener error:', e); }
    });
  }

  function formatValue(value) {
    if (value === null || value === undefined) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (typeof value === 'number') return value.toLocaleString();
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  }

  // ============================================
  // Table Interactivity
  // ============================================
  function filterTable(tableId, column, value) {
    const table = document.querySelector(\`[data-table-id="\${tableId}"]\`);
    if (!table) return;

    const rows = table.querySelectorAll('tbody tr');
    const colIndex = getColumnIndex(table, column);

    rows.forEach(row => {
      const cell = row.cells[colIndex];
      if (!cell) return;
      const cellValue = cell.textContent.trim().toLowerCase();
      const filterValue = String(value).toLowerCase();
      row.style.display = (value === '' || cellValue.includes(filterValue)) ? '' : 'none';
    });
  }

  function sortTable(tableId, column, direction = 'asc') {
    const table = document.querySelector(\`[data-table-id="\${tableId}"]\`);
    if (!table) return;

    const tbody = table.querySelector('tbody');
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const colIndex = getColumnIndex(table, column);

    rows.sort((a, b) => {
      const aVal = getCellValue(a.cells[colIndex]);
      const bVal = getCellValue(b.cells[colIndex]);
      const cmp = aVal < bVal ? -1 : (aVal > bVal ? 1 : 0);
      return direction === 'asc' ? cmp : -cmp;
    });

    rows.forEach(row => tbody.appendChild(row));

    // Update sort indicators
    table.querySelectorAll('th').forEach((th, i) => {
      th.classList.remove('sort-asc', 'sort-desc');
      if (i === colIndex) {
        th.classList.add(direction === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    });
  }

  function getColumnIndex(table, column) {
    const headers = table.querySelectorAll('th');
    for (let i = 0; i < headers.length; i++) {
      if (headers[i].dataset.column === column || headers[i].textContent.trim() === column) {
        return i;
      }
    }
    return 0;
  }

  function getCellValue(cell) {
    if (!cell) return '';
    const val = cell.dataset.value || cell.textContent.trim();
    const num = parseFloat(val.replace(/[,$%]/g, ''));
    return isNaN(num) ? val.toLowerCase() : num;
  }

  // ============================================
  // Input Controls
  // ============================================
  function updateDependentComponents(inputName) {
    // Find tables that filter by this input
    document.querySelectorAll(\`[data-filter-input="\${inputName}"]\`).forEach(el => {
      const tableId = el.dataset.tableId;
      const column = el.dataset.filterColumn;
      const value = state.inputs[inputName];
      filterTable(tableId, column, value || '');
    });

    // Update display elements
    document.querySelectorAll(\`[data-bind="\${inputName}"]\`).forEach(el => {
      el.textContent = state.inputs[inputName] || '';
    });
  }

  // ============================================
  // Initialize on DOM ready
  // ============================================
  function init() {
    // Initialize dropdown controls
    document.querySelectorAll('[data-miao-dropdown]').forEach(select => {
      const inputName = select.dataset.miaoDropdown;
      const defaultValue = select.dataset.defaultValue;
      if (defaultValue) setInput(inputName, defaultValue);

      select.addEventListener('change', (e) => {
        setInput(inputName, e.target.value);
      });
    });

    // Initialize button group controls
    document.querySelectorAll('[data-miao-buttongroup]').forEach(container => {
      const inputName = container.dataset.miaoButtongroup;
      container.querySelectorAll('button').forEach(btn => {
        btn.addEventListener('click', () => {
          container.querySelectorAll('button').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          setInput(inputName, btn.dataset.value);
        });
      });
    });

    // Initialize sortable tables
    document.querySelectorAll('[data-miao-sortable] th[data-column]').forEach(th => {
      th.style.cursor = 'pointer';
      th.addEventListener('click', () => {
        const table = th.closest('table');
        const tableId = table.dataset.tableId;
        const column = th.dataset.column;
        const currentDir = th.classList.contains('sort-asc') ? 'desc' : 'asc';
        sortTable(tableId, column, currentDir);
      });
    });

    console.log('🎯 MiaoVision Interactive Runtime initialized');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}

/**
 * Generate CSS styles for the interactive runtime
 */
export function generateInteractiveStyles(): string {
  return `
/* MiaoVision Interactive Runtime Styles */

/* Buttons */
.miao-btn {
  padding: 0.5rem 1rem;
  background: #374151;
  border: 1px solid #4B5563;
  border-radius: 6px;
  color: #E5E7EB;
  font-size: 0.875rem;
  cursor: pointer;
}

.miao-btn:hover {
  background: #4B5563;
}

/* Sortable Tables */
[data-miao-sortable] th {
  position: relative;
  user-select: none;
}

[data-miao-sortable] th::after {
  content: '';
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  border: 5px solid transparent;
  opacity: 0.3;
}

[data-miao-sortable] th.sort-asc::after {
  border-bottom-color: currentColor;
  opacity: 1;
}

[data-miao-sortable] th.sort-desc::after {
  border-top-color: currentColor;
  opacity: 1;
}

/* Input Controls */
.miao-dropdown {
  padding: 0.5rem 0.75rem;
  background: #1F2937;
  border: 1px solid #374151;
  border-radius: 6px;
  color: #F3F4F6;
  font-size: 0.875rem;
}

.miao-buttongroup {
  display: inline-flex;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #374151;
}

.miao-buttongroup button {
  padding: 0.5rem 1rem;
  background: #1F2937;
  border: none;
  border-right: 1px solid #374151;
  color: #9CA3AF;
  font-size: 0.875rem;
  cursor: pointer;
}

.miao-buttongroup button:last-child {
  border-right: none;
}

.miao-buttongroup button:hover {
  background: #374151;
}

.miao-buttongroup button.active {
  background: #3B82F6;
  color: white;
}
`;
}
