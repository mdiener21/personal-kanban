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

function safeDate(value) {
  const raw = (value || '').toString().trim();
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

function startOfWeekMonday(date) {
  // Week bucket uses local time; Monday as start.
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay(); // 0=Sun..6=Sat
  const delta = (day + 6) % 7; // Mon=0, Sun=6
  d.setDate(d.getDate() - delta);
  return d;
}

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function formatWeekLabel(weekStart) {
  const end = addDays(weekStart, 6);
  return `${formatIsoDate(weekStart)}…${formatIsoDate(end)}`;
}

function eachWeekStartInclusive(rangeStart, rangeEnd) {
  const weeks = [];
  const start = startOfWeekMonday(rangeStart);
  const end = startOfWeekMonday(rangeEnd);
  const d = new Date(start);
  while (d <= end) {
    weeks.push(new Date(d));
    d.setDate(d.getDate() + 7);
  }
  return weeks;
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

function movingAverage(values, windowSize) {
  const w = Math.max(1, Number(windowSize) || 1);
  const out = [];
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - w + 1);
    const slice = values.slice(start, i + 1).filter((v) => Number.isFinite(v));
    if (slice.length === 0) {
      out.push(null);
      continue;
    }
    const avg = slice.reduce((s, v) => s + v, 0) / slice.length;
    out.push(Number(avg.toFixed(2)));
  }
  return out;
}

function computeWeeklyLeadTimeAndCompletions(tasks, rangeStart, rangeEnd) {
  const buckets = new Map();

  for (const task of tasks) {
    const created = safeDate(task?.creationDate);
    const done = safeDate(task?.doneDate);
    if (!created || !done) continue;
    if (done < rangeStart || done > rangeEnd) continue;

    const weekStart = startOfWeekMonday(done);
    const key = formatIsoDate(weekStart);
    const leadDays = (done.getTime() - created.getTime()) / (24 * 60 * 60 * 1000);
    if (!Number.isFinite(leadDays) || leadDays < 0) continue;

    const bucket = buckets.get(key) || { count: 0, leadSumDays: 0 };
    bucket.count += 1;
    bucket.leadSumDays += leadDays;
    buckets.set(key, bucket);
  }

  const weekStarts = eachWeekStartInclusive(rangeStart, rangeEnd);
  const labels = weekStarts.map(formatWeekLabel);
  const keys = weekStarts.map((w) => formatIsoDate(w));

  const completedCounts = keys.map((k) => buckets.get(k)?.count || 0);
  const avgLeadDays = keys.map((k) => {
    const b = buckets.get(k);
    if (!b || b.count === 0) return null;
    return Number((b.leadSumDays / b.count).toFixed(2));
  });

  const totalCompleted = completedCounts.reduce((s, v) => s + v, 0);
  const leadDaysAll = keys
    .map((k) => {
      const b = buckets.get(k);
      if (!b || b.count === 0) return null;
      return b.leadSumDays / b.count;
    })
    .filter((v) => Number.isFinite(v));

  const avgLeadOverall = leadDaysAll.length
    ? (leadDaysAll.reduce((s, v) => s + v, 0) / leadDaysAll.length)
    : null;

  return {
    labels,
    completedCounts,
    avgLeadDays,
    trendLeadDays: movingAverage(avgLeadDays.map((v) => (v == null ? NaN : v)), 4),
    totalCompleted,
    avgLeadOverall
  };
}

function buildLeadTimeOption({ labels, avgLeadDays, trendLeadDays, completedCounts }) {
  const maxLead = Math.max(1, ...avgLeadDays.map((v) => (Number.isFinite(v) ? v : 0)));

  return {
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
      formatter: (params) => {
        const items = Array.isArray(params) ? params : [];
        const header = items[0]?.axisValueLabel || '';
        const byName = new Map(items.map((p) => [p.seriesName, p.value]));
        const avg = byName.get('Avg lead time (days)');
        const trend = byName.get('Trend (4-week MA)');
        const completed = byName.get('Completed');
        const avgText = Number.isFinite(avg) ? `${avg}d` : '—';
        const trendText = Number.isFinite(trend) ? `${trend}d` : '—';
        const completedText = Number.isFinite(completed) ? `${completed}` : '0';
        return `${header}<br/>Completed: ${completedText}<br/>Avg lead time: ${avgText}<br/>Trend: ${trendText}`;
      }
    },
    legend: {
      top: 8
    },
    grid: {
      left: 40,
      right: 40,
      top: 50,
      bottom: 40
    },
    xAxis: {
      type: 'category',
      data: labels,
      axisLabel: { interval: 1, rotate: 20 }
    },
    yAxis: [
      {
        type: 'value',
        name: 'Days',
        min: 0,
        max: Math.ceil(maxLead)
      },
      {
        type: 'value',
        name: 'Completed',
        min: 0,
        axisLabel: { formatter: '{value}' }
      }
    ],
    series: [
      {
        name: 'Avg lead time (days)',
        type: 'bar',
        data: avgLeadDays.map((v) => (v == null ? 0 : v)),
        itemStyle: { color: '#3b82f6' },
        yAxisIndex: 0
      },
      {
        name: 'Trend (4-week MA)',
        type: 'line',
        data: trendLeadDays.map((v) => (v == null ? null : v)),
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        lineStyle: { width: 3, color: '#16a34a' },
        itemStyle: { color: '#16a34a' },
        yAxisIndex: 0
      },
      {
        name: 'Completed',
        type: 'line',
        data: completedCounts,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, type: 'dashed', color: '#6b7280' },
        yAxisIndex: 1
      }
    ]
  };
}

function buildCompletedSparkOption({ labels, completedCounts }) {
  return {
    grid: { left: 8, right: 8, top: 8, bottom: 8 },
    xAxis: {
      type: 'category',
      data: labels,
      show: false
    },
    yAxis: {
      type: 'value',
      show: false,
      min: 0
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'line' },
      formatter: (params) => {
        const p = Array.isArray(params) ? params[0] : params;
        const label = p?.axisValueLabel || '';
        const v = p?.value ?? 0;
        return `${label}<br/>Completed: ${v}`;
      }
    },
    series: [
      {
        type: 'line',
        data: completedCounts,
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 2, color: '#3b82f6' },
        areaStyle: { color: 'rgba(59, 130, 246, 0.18)' }
      }
    ]
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

  // Weekly completion + lead time (last 12 weeks)
  const now = new Date();
  const endWeekRange = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const startWeekRange = addDays(endWeekRange, -7 * 11); // inclusive: 12 weeks
  const weekly = computeWeeklyLeadTimeAndCompletions(tasks, startWeekRange, endWeekRange);

  const completedThisWeek = weekly.completedCounts[weekly.completedCounts.length - 1] || 0;
  const completedLastWeek = weekly.completedCounts[weekly.completedCounts.length - 2] || 0;
  const avgLead12w = Number.isFinite(weekly.avgLeadOverall) ? `${weekly.avgLeadOverall.toFixed(1)}d` : '–';

  const kpiThis = document.getElementById('reports-completed-this-week');
  const kpiLast = document.getElementById('reports-completed-last-week');
  const kpiAvgLead = document.getElementById('reports-avg-leadtime-12w');
  if (kpiThis) kpiThis.textContent = String(completedThisWeek);
  if (kpiLast) kpiLast.textContent = String(completedLastWeek);
  if (kpiAvgLead) kpiAvgLead.textContent = avgLead12w;

  const leadBadge = document.getElementById('reports-leadtime-badge');
  if (leadBadge) leadBadge.textContent = String(weekly.totalCompleted);

  const sparkDom = document.getElementById('reports-completed-spark');
  if (sparkDom) {
    const spark = echarts.init(sparkDom);
    // Show only last 12 weeks labels on spark (shorten for tooltip only).
    spark.setOption(buildCompletedSparkOption({ labels: weekly.labels, completedCounts: weekly.completedCounts }));
    window.addEventListener('resize', () => spark.resize());
  }

  const leadDom = document.getElementById('reports-leadtime-chart');
  if (leadDom) {
    const leadChart = echarts.init(leadDom);
    leadChart.setOption(buildLeadTimeOption({
      labels: weekly.labels,
      avgLeadDays: weekly.avgLeadDays,
      trendLeadDays: weekly.trendLeadDays,
      completedCounts: weekly.completedCounts
    }));
    window.addEventListener('resize', () => leadChart.resize());
  }

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
