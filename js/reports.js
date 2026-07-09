/**
 * 批量数据报表页逻辑
 * Chart.js 饼图渲染、月度表格、PDF导出模拟、权限隔离
 */

document.addEventListener('DOMContentLoaded', () => {
  // 权限检查
  if (!canViewReports()) {
    document.getElementById('reports-content').classList.add('hidden');
    document.getElementById('permission-denied').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
    return;
  }

  // 初始化图表
  initPieChart();
  // 渲染月度表格
  renderMonthlyTable();
  // 初始化图标
  if (window.lucide) lucide.createIcons();

  // PDF导出模拟
  document.getElementById('btn-export')?.addEventListener('click', () => {
    showToast('正在生成PDF报告...');
    setTimeout(() => {
      showToast('PDF报告已生成（演示模式）');
    }, 1500);
  });
});

/**
 * 初始化缺陷占比饼图
 */
function initPieChart() {
  const ctx = document.getElementById('defectPieChart');
  if (!ctx) return;

  const data = window.REPORT_DATA?.defectPie;
  if (!data) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.labels,
      datasets: [{
        data: data.data,
        backgroundColor: data.colors,
        borderWidth: 0,
        hoverOffset: 8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '60%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            color: '#94A3B8',
            padding: 16,
            font: { size: 12 }
          }
        },
        tooltip: {
          backgroundColor: '#1E293B',
          titleColor: '#F1F5F9',
          bodyColor: '#94A3B8',
          borderColor: '#334155',
          borderWidth: 1,
          padding: 12,
          callbacks: {
            label: function(context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const val = context.raw;
              const pct = ((val / total) * 100).toFixed(1);
              return ` ${context.label}: ${val} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

/**
 * 渲染月度数据表格
 */
function renderMonthlyTable() {
  const tbody = document.getElementById('monthly-table-body');
  const rows = window.REPORT_DATA?.monthly || [];

  tbody.innerHTML = rows.map((row, idx) => {
    const prev = idx > 0 ? rows[idx - 1] : null;
    const trendInspection = prev ? row.inspections - prev.inspections : 0;
    const trendHigh = prev ? row.highRisk - prev.highRisk : 0;

    let trendHtml = '<span class="text-[#94A3B8]">-</span>';
    if (prev) {
      if (trendInspection > 0) {
        trendHtml = `<span class="text-[#22C55E]">↑ ${trendInspection}</span>`;
      } else if (trendInspection < 0) {
        trendHtml = `<span class="text-[#EF4444]">↓ ${Math.abs(trendInspection)}</span>`;
      } else {
        trendHtml = '<span class="text-[#94A3B8]">→ 0</span>';
      }
    }

    return `
      <tr>
        <td class="text-[#F1F5F9]">${row.month}</td>
        <td class="text-[#F1F5F9]">${row.inspections}</td>
        <td class="text-[#EF4444] font-medium">${row.highRisk}</td>
        <td class="text-[#8B5CF6]">${row.prdDefects}</td>
        <td>${trendHtml}</td>
      </tr>
    `;
  }).join('');
}

function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  const bg = type === 'warning' ? 'bg-[#F59E0B]' : 'bg-[#165DFF]';
  toast.className = `fixed top-20 right-6 ${bg} text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50 fade-in`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}
