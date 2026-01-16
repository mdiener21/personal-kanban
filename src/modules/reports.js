import * as echarts from 'echarts';
import { renderIcons } from './icons.js';
import { ensureBoardsInitialized, getActiveBoardId, getActiveBoardName } from './storage.js';
import { loadTasks } from './storage.js';

function isoDateOnly(value) {
  const s = (value || '').toString().trim();
  if (!s) return '';
  // Most stored values are ISO strings; we only need YYYY-MM-DD.
  if (s.length >= 10) return s.slice(0, 10);
  return '';
}

function formatIsoDate(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function eachDayInclusive(start, end) {
  const days = [];
  const d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate());
  while (d <= last) {
    days.push(new Date(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function computeDailyUpdateCounts(tasks, startDate, endDate) {
  const counts = new Map();

  for (const task of tasks) {
    const day = isoDateOnly(task?.changeDate);
    if (!day) continue;
    counts.set(day, (counts.get(day) || 0) + 1);
  }

  const allDays = eachDayInclusive(startDate, endDate);
  const data = allDays.map((d) => {
    const key = formatIsoDate(d);
    return [key, counts.get(key) || 0];
  });

  const max = data.reduce((m, [, v]) => Math.max(m, Number(v) || 0), 0);
  return { data, max };
}

function buildOption({ rangeStart, rangeEnd, data, maxValue, boardName }) {
  const max = Math.max(1, maxValue || 0);

  return {
    title: {
      top: 20,
      left: 'center',
      text: `Daily updates — ${boardName}`
    },
    tooltip: {
      formatter: (params) => {
        const date = params?.value?.[0] || '';
        const value = params?.value?.[1] ?? 0;
        return `${date}: ${value} update${value === 1 ? '' : 's'}`;
      }
    },
    visualMap: {
      min: 0,
      max,
      type: 'piecewise',
      orient: 'horizontal',
      left: 'center',
      top: 55
    },
    calendar: {
      top: 110,
      left: 30,
      right: 30,
      cellSize: ['auto', 14],
      range: [formatIsoDate(rangeStart), formatIsoDate(rangeEnd)],
      itemStyle: {
        borderWidth: 0.5
      },
      yearLabel: { show: false }
    },
    series: {
      type: 'heatmap',
      coordinateSystem: 'calendar',
      data
    }
  };
}

function main() {
  ensureBoardsInitialized();
  renderIcons();

  const boardName = getActiveBoardName();
  const boardId = getActiveBoardId();

  const badge = document.getElementById('reports-board-badge');
  if (badge) badge.textContent = (boardName || 'Board').slice(0, 2).toUpperCase();

  const chartDom = document.getElementById('reports-chart');
  if (!chartDom) return;

  const tasks = loadTasks();

  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 364); // inclusive range: 365 days

  const { data, max } = computeDailyUpdateCounts(tasks, start, end);

  const chart = echarts.init(chartDom);
  const option = buildOption({
    rangeStart: start,
    rangeEnd: end,
    data,
    maxValue: max,
    boardName: boardName || (boardId || 'Active board')
  });

  chart.setOption(option);
  window.addEventListener('resize', () => chart.resize());
}

main();
