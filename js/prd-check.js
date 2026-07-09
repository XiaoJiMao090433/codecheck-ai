/**
 * PRD需求文档质检页逻辑
 * 文档上传/粘贴、缺陷扫描、任务拆解、测试用例生成
 */

let currentPrd = '';
let detectedDefects = [];

// DOM 元素
document.addEventListener('DOMContentLoaded', () => {
  const prdInput = document.getElementById('prd-input');
  const defectList = document.getElementById('defect-list');
  const btnLoadDemo = document.getElementById('btn-load-demo');
  const btnAnalyze = document.getElementById('btn-analyze');
  const btnClear = document.getElementById('btn-clear');
  const btnCopyCases = document.getElementById('btn-copy-cases');
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const loadingOverlay = document.getElementById('loading-overlay');

  // 加载演示素材
  btnLoadDemo?.addEventListener('click', () => {
    prdInput.value = window.DEMO_PRD || '';
    showToast('演示素材已加载');
  });

  // 开始AI质检
  btnAnalyze?.addEventListener('click', () => {
    const text = prdInput.value.trim();
    if (!text) {
      showToast('请先输入PRD文档内容', 'warning');
      return;
    }
    currentPrd = text;
    loadingOverlay.classList.add('active');
    setTimeout(() => {
      analyzePrd(text);
      loadingOverlay.classList.remove('active');
      showToast('质检完成，发现 ' + detectedDefects.length + ' 处缺陷');
    }, 1200);
  });

  // 清空
  btnClear?.addEventListener('click', () => {
    prdInput.value = '';
    currentPrd = '';
    detectedDefects = [];
    resetPanels();
    showToast('已清空');
  });

  // 复制测试用例
  btnCopyCases?.addEventListener('click', () => {
    const cases = buildTestCaseText();
    navigator.clipboard.writeText(cases).then(() => showToast('测试用例已复制'));
  });

  // 文件上传模拟
  uploadZone?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        prdInput.value = ev.target.result;
        showToast('文件已加载：' + file.name);
      };
      reader.readAsText(file);
    }
  });
});

/**
 * 分析PRD文档缺陷
 */
function analyzePrd(text) {
  detectedDefects = [];
  const rules = window.PRD_DEFECT_RULES || [];

  rules.forEach(rule => {
    rule.pattern.lastIndex = 0;
    const lines = text.split('\n');
    lines.forEach((line, idx) => {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line)) {
        detectedDefects.push({
          ...rule,
          line: idx + 1,
          content: line.trim()
        });
      }
    });
  });

  // 去重
  const seen = new Set();
  detectedDefects = detectedDefects.filter(d => {
    const key = d.id + '-' + d.line;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  renderDefects(detectedDefects);
  renderTasks();
  renderTestCases();
}

/**
 * 渲染缺陷列表
 */
function renderDefects(defects) {
  const list = document.getElementById('defect-list');
  if (!defects.length) {
    list.innerHTML = '<div class="text-sm text-[#64748B] text-center mt-20">未检测到明显缺陷</div>';
    return;
  }

  list.innerHTML = defects.map((d, idx) => `
    <div class="mb-4 p-4 rounded-lg border border-[#1E293B] bg-[#0B1120]">
      <div class="flex items-center justify-between mb-2">
        <div class="flex items-center gap-2">
          <span class="tag tag-${d.level}">${levelText(d.level)}</span>
          <span class="text-sm font-medium text-[#F1F5F9]">${d.title}</span>
        </div>
        <span class="text-xs text-[#64748B]">第 ${d.line} 行</span>
      </div>
      <div class="text-xs text-[#64748B] mb-2 bg-[#111827] p-2 rounded border border-[#1E293B]">
        ${escapeHtml(d.content)}
      </div>
      <p class="text-xs text-[#94A3B8] leading-relaxed mb-1">
        <span class="text-[#EF4444]">问题：</span>${d.reason}
      </p>
      <p class="text-xs text-[#22C55E] leading-relaxed">
        <span class="text-[#22C55E]">建议：</span>${d.suggestion}
      </p>
    </div>
  `).join('');
}

/**
 * 渲染自动拆解任务
 */
function renderTasks() {
  const tasks = window.DEMO_TASKS || { frontend: [], backend: [], test: [] };

  const renderCol = (containerId, items, colorClass) => {
    const el = document.getElementById(containerId);
    el.innerHTML = items.map(t => `
      <div class="task-card">
        <h4 class="text-sm font-medium text-[#F1F5F9] mb-1">${t.title}</h4>
        <p class="text-xs text-[#94A3B8] leading-relaxed">${t.desc}</p>
      </div>
    `).join('');
  };

  renderCol('task-frontend', tasks.frontend, 'blue');
  renderCol('task-backend', tasks.backend, 'green');
  renderCol('task-test', tasks.test, 'yellow');
}

/**
 * 渲染测试用例
 */
function renderTestCases() {
  const tasks = window.DEMO_TASKS || { test: [] };
  const container = document.getElementById('test-cases');
  const btnCopy = document.getElementById('btn-copy-cases');

  if (!tasks.test.length) {
    container.innerHTML = '<div class="text-sm text-[#64748B] text-center py-10">完成质检后将在此生成测试用例</div>';
    btnCopy.classList.add('hidden');
    return;
  }

  container.innerHTML = tasks.test.map((t, idx) => `
    <div class="mb-3 p-3 rounded-lg border border-[#1E293B] bg-[#0B1120]">
      <div class="flex items-center gap-2 mb-1">
        <span class="text-xs font-mono text-[#60A5FA]">TC-${String(idx + 1).padStart(2, '0')}</span>
        <span class="text-sm font-medium text-[#F1F5F9]">${t.title}</span>
      </div>
      <p class="text-xs text-[#94A3B8] leading-relaxed">${t.desc}</p>
    </div>
  `).join('');

  btnCopy.classList.remove('hidden');
}

function buildTestCaseText() {
  const tasks = window.DEMO_TASKS || { test: [] };
  return tasks.test.map((t, idx) => `TC-${String(idx + 1).padStart(2, '0')}: ${t.title}\n${t.desc}`).join('\n\n');
}

function resetPanels() {
  document.getElementById('defect-list').innerHTML = '<div class="text-sm text-[#64748B] text-center mt-20">请输入PRD文档或加载演示素材开始质检</div>';
  document.getElementById('task-frontend').innerHTML = '<div class="text-xs text-[#64748B] text-center py-6">等待质检结果</div>';
  document.getElementById('task-backend').innerHTML = '<div class="text-xs text-[#64748B] text-center py-6">等待质检结果</div>';
  document.getElementById('task-test').innerHTML = '<div class="text-xs text-[#64748B] text-center py-6">等待质检结果</div>';
  document.getElementById('test-cases').innerHTML = '<div class="text-sm text-[#64748B] text-center py-10">完成质检后将在此生成测试用例</div>';
  document.getElementById('btn-copy-cases').classList.add('hidden');
}

function levelText(level) {
  const map = { high: '高危', medium: '中危', low: '低危' };
  return map[level] || level;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showToast(msg, type = 'info') {
  const toast = document.createElement('div');
  const bg = type === 'warning' ? 'bg-[#F59E0B]' : 'bg-[#165DFF]';
  toast.className = `fixed top-20 right-6 ${bg} text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50 fade-in`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}
