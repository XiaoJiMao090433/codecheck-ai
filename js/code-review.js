/**
 * 代码智能审查页逻辑
 * 代码输入、AI模拟分析、风险高亮、优化代码生成
 */

let currentCode = '';
let detectedRisks = [];
let currentFixCode = '';

// DOM 元素
document.addEventListener('DOMContentLoaded', () => {
  const codeInput = document.getElementById('code-input');
  const codeEditor = document.getElementById('code-editor');
  const riskList = document.getElementById('risk-list');
  const fixOutput = document.getElementById('fix-output');
  const btnLoadDemo = document.getElementById('btn-load-demo');
  const btnAnalyze = document.getElementById('btn-analyze');
  const btnClear = document.getElementById('btn-clear');
  const btnGenFix = document.getElementById('btn-gen-fix');
  const btnCopyFix = document.getElementById('btn-copy-fix');
  const uploadZone = document.getElementById('upload-zone');
  const fileInput = document.getElementById('file-input');
  const loadingOverlay = document.getElementById('loading-overlay');
  const modal = document.getElementById('risk-modal');
  const modalClose = document.getElementById('modal-close');
  const modalGenFix = document.getElementById('modal-gen-fix');

  // 加载演示素材
  btnLoadDemo?.addEventListener('click', () => {
    codeInput.value = window.DEMO_PYTHON_CODE || '';
    renderEditor(codeInput.value);
    showToast('演示素材已加载');
  });

  // 开始AI审查
  btnAnalyze?.addEventListener('click', () => {
    const code = codeInput.value.trim();
    if (!code) {
      showToast('请先输入代码', 'warning');
      return;
    }
    currentCode = code;
    loadingOverlay.classList.add('active');
    setTimeout(() => {
      analyzeCode(code);
      loadingOverlay.classList.remove('active');
      showToast('审查完成，发现 ' + detectedRisks.length + ' 处风险');
    }, 1200);
  });

  // 清空
  btnClear?.addEventListener('click', () => {
    codeInput.value = '';
    currentCode = '';
    detectedRisks = [];
    currentFixCode = '';
    codeEditor.innerHTML = '<div class="text-sm text-[#64748B] text-center mt-20">请输入代码或加载演示素材开始审查</div>';
    riskList.innerHTML = '<div class="text-sm text-[#64748B] text-center mt-10">暂无检测结果</div>';
    fixOutput.innerHTML = '<div class="text-sm text-[#64748B] text-center mt-10">点击「一键生成」或风险项生成优化代码</div>';
    btnCopyFix.classList.add('hidden');
  });

  // 复制优化代码
  btnCopyFix?.addEventListener('click', () => {
    if (currentFixCode) {
      navigator.clipboard.writeText(currentFixCode).then(() => showToast('已复制到剪贴板'));
    }
  });

  // 一键生成优化代码按钮
  btnGenFix?.addEventListener('click', () => {
    if (!currentCode) {
      showToast('请先输入或审查代码', 'warning');
      return;
    }
    if (!detectedRisks.length) {
      showToast('请先进行AI审查', 'warning');
      return;
    }
    generateFullFix();
  });

  // 文件上传模拟
  uploadZone?.addEventListener('click', () => fileInput?.click());
  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        codeInput.value = ev.target.result;
        renderEditor(codeInput.value);
        showToast('文件已加载：' + file.name);
      };
      reader.readAsText(file);
    }
  });

  // 弹窗关闭
  modalClose?.addEventListener('click', () => modal.classList.remove('active'));
  modal?.addEventListener('click', (e) => { if (e.target === modal) modal.classList.remove('active'); });

  // 弹窗内生成修复代码
  modalGenFix?.addEventListener('click', () => {
    generateFullFix();
    modal.classList.remove('active');
  });

  // 输入时实时预览（可选）
  codeInput?.addEventListener('input', () => {
    // 不实时高亮风险，仅预览代码
    renderEditor(codeInput.value);
  });
});

/**
 * 渲染代码编辑器（带行号）
 */
function renderEditor(code) {
  const editor = document.getElementById('code-editor');
  if (!code.trim()) {
    editor.innerHTML = '<div class="text-sm text-[#64748B] text-center mt-20">请输入代码或加载演示素材开始审查</div>';
    return;
  }
  const lines = code.split('\n');
  const html = lines.map((line, idx) => `
    <div class="code-line" data-line="${idx + 1}">
      <span class="line-number">${idx + 1}</span>
      <span class="line-content">${escapeHtml(line) || ' '}</span>
    </div>
  `).join('');
  editor.innerHTML = html;
}

/**
 * 分析代码风险
 */
function analyzeCode(code) {
  detectedRisks = [];
  const lines = code.split('\n');
  const rules = window.CODE_DEFECT_RULES || [];

  rules.forEach(rule => {
    // 重置正则 lastIndex
    rule.pattern.lastIndex = 0;
    let match;
    // 按行匹配（简单模拟）
    lines.forEach((line, idx) => {
      rule.pattern.lastIndex = 0;
      if (rule.pattern.test(line)) {
        detectedRisks.push({
          ...rule,
          line: idx + 1,
          content: line.trim()
        });
      }
    });
    // 也尝试多行匹配
    rule.pattern.lastIndex = 0;
    const multiMatch = code.match(rule.pattern);
    if (multiMatch && !detectedRisks.some(r => r.id === rule.id)) {
      // 找到匹配起始行
      const before = code.substring(0, multiMatch.index);
      const lineNum = before.split('\n').length;
      detectedRisks.push({
        ...rule,
        line: lineNum,
        content: multiMatch[0].split('\n')[0].trim()
      });
    }
  });

  // 去重（按id+line）
  const seen = new Set();
  detectedRisks = detectedRisks.filter(r => {
    const key = r.id + '-' + r.line;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // 排序：高危 > 中危 > 低危
  const order = { high: 0, medium: 1, low: 2 };
  detectedRisks.sort((a, b) => order[a.level] - order[b.level]);

  renderEditorWithRisks(code, detectedRisks);
  renderRiskList(detectedRisks);
}

/**
 * 渲染带风险高亮的编辑器
 */
function renderEditorWithRisks(code, risks) {
  const lines = code.split('\n');
  const riskMap = {};
  risks.forEach(r => {
    if (!riskMap[r.line]) riskMap[r.line] = r.level;
    // 如果同一行有更高危的，保留更高危
    const priority = { high: 3, medium: 2, low: 1 };
    if (priority[r.level] > priority[riskMap[r.line]]) {
      riskMap[r.line] = r.level;
    }
  });

  const html = lines.map((line, idx) => {
    const lineNum = idx + 1;
    const riskClass = riskMap[lineNum] ? `risk-${riskMap[lineNum]}` : '';
    return `
      <div class="code-line ${riskClass}" data-line="${lineNum}" onclick="onLineClick(${lineNum})">
        <span class="line-number">${lineNum}</span>
        <span class="line-content">${escapeHtml(line) || ' '}</span>
      </div>
    `;
  }).join('');

  document.getElementById('code-editor').innerHTML = html;
}

/**
 * 渲染风险列表面板
 */
function renderRiskList(risks) {
  const list = document.getElementById('risk-list');
  if (!risks.length) {
    list.innerHTML = '<div class="text-sm text-[#64748B] text-center mt-10">未检测到风险</div>';
    return;
  }

  list.innerHTML = risks.map(r => `
    <div class="mb-3 p-3 rounded-lg border border-[#1E293B] hover:border-[#334155] cursor-pointer transition-colors"
         onclick="showRiskDetail('${r.id}', ${r.line})">
      <div class="flex items-center justify-between mb-1">
        <span class="tag tag-${r.level} text-xs">${levelText(r.level)}</span>
        <span class="text-xs text-[#64748B]">第 ${r.line} 行</span>
      </div>
      <p class="text-sm text-[#F1F5F9] font-medium truncate">${r.title}</p>
      <p class="text-xs text-[#94A3B8] mt-1 truncate">${escapeHtml(r.content)}</p>
    </div>
  `).join('');
}

/**
 * 点击行号展示风险详情
 */
window.onLineClick = function(lineNum) {
  const risk = detectedRisks.find(r => r.line === lineNum);
  if (risk) {
    showRiskDetail(risk.id, risk.line);
  }
};

/**
 * 展示风险详情弹窗
 */
window.showRiskDetail = function(id, line) {
  const risk = detectedRisks.find(r => r.id === id && r.line === line);
  if (!risk) return;

  const modal = document.getElementById('risk-modal');
  const tagEl = document.getElementById('modal-tag');
  const titleEl = document.getElementById('modal-title');
  const reasonEl = document.getElementById('modal-reason');
  const fixEl = document.getElementById('modal-fix');

  tagEl.className = `tag tag-${risk.level}`;
  tagEl.textContent = levelText(risk.level);
  titleEl.textContent = risk.title;
  reasonEl.textContent = risk.reason;
  fixEl.textContent = risk.fix;

  modal.classList.add('active');
  if (window.lucide) lucide.createIcons();
};

/**
 * 生成完整修复代码（模拟）
 */
function generateFullFix() {
  if (!currentCode) return;
  let fixed = currentCode;

  // 模拟修复：为演示素材做特定替换
  const replacements = [
    { from: 'password="123456"', to: 'password=os.environ.get("DB_PASSWORD", "")' },
    { from: 'query = "SELECT * FROM users WHERE username=\'" + username + "\' AND password=\'" + password + "\'"', to: 'query = "SELECT * FROM users WHERE username=%s AND password=%s"\n    cursor.execute(query, (username, password))' },
    { from: 'if user.get("is_admin") == True:', to: '# TODO: 从服务端会话查询用户真实权限角色\n    if check_server_permission(user.get("session_id"), "admin"):' },
    { from: '    for i in range(len(items)):\n        for j in range(len(items)):\n            if items[i] == items[j] and i != j:\n                res.append(items[i])\n    return res', to: '    seen = set()\n    duplicates = set()\n    for item in items:\n        if item in seen:\n            duplicates.add(item)\n        seen.add(item)\n    return list(duplicates)' },
    { from: '    f = open(path, "r")\n    data = f.read()\n    return data', to: '    with open(path, "r") as f:\n        data = f.read()\n    return data' },
    { from: 'class userManager:', to: 'class UserManager:' }
  ];

  replacements.forEach(rep => {
    fixed = fixed.replace(rep.from, rep.to);
  });

  currentFixCode = fixed;
  const fixOutput = document.getElementById('fix-output');
  const lines = fixed.split('\n');
  fixOutput.innerHTML = lines.map((line, idx) => `
    <div class="code-line">
      <span class="line-number">${idx + 1}</span>
      <span class="line-content">${escapeHtml(line) || ' '}</span>
    </div>
  `).join('');

  document.getElementById('btn-copy-fix').classList.remove('hidden');
  showToast('AI优化代码已生成');
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
  // 简易 toast
  const toast = document.createElement('div');
  const bg = type === 'warning' ? 'bg-[#F59E0B]' : 'bg-[#165DFF]';
  toast.className = `fixed top-20 right-6 ${bg} text-white px-4 py-2 rounded-lg text-sm shadow-lg z-50 fade-in`;
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}
