/**
 * 公共布局模块
 * 渲染侧边导航栏、顶部栏，并初始化权限控制
 */

function renderLayout() {
  const role = getCurrentRole();

  // 顶部栏 HTML
  const headerHtml = `
    <header class="h-16 bg-[#111827] border-b border-[#1E293B] flex items-center justify-between px-6 sticky top-0 z-40">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-gradient-to-br from-[#165DFF] to-[#104ECC] flex items-center justify-center">
          <i data-lucide="shield-check" class="w-5 h-5 text-white"></i>
        </div>
        <span class="text-lg font-semibold text-white tracking-wide">CodeCheck AI</span>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 text-sm text-[#94A3B8]">
          <i data-lucide="user" class="w-4 h-4"></i>
          <span id="current-role-name">${role.name}</span>
        </div>
        <select id="role-selector" class="role-select text-sm">
          <option value="intern">实习生</option>
          <option value="developer">普通开发</option>
          <option value="cto">技术总监</option>
        </select>
      </div>
    </header>
  `;

  // 侧边栏 HTML
  const sidebarHtml = `
    <aside class="sidebar h-screen flex flex-col fixed left-0 top-0 pt-16">
      <nav class="flex-1 py-4">
        <a href="index.html" class="nav-item ${isActive('index')}" data-page="dashboard">
          <i data-lucide="layout-dashboard" class="w-5 h-5"></i>
          <span>工作台首页</span>
        </a>
        <a href="code-review.html" class="nav-item ${isActive('code-review')}" data-page="code-review">
          <i data-lucide="code-2" class="w-5 h-5"></i>
          <span>代码智能审查</span>
        </a>
        <a href="prd-check.html" class="nav-item ${isActive('prd-check')}" data-page="prd-check">
          <i data-lucide="file-text" class="w-5 h-5"></i>
          <span>PRD需求质检</span>
        </a>
        <a href="reports.html" class="nav-item ${isActive('reports')}" data-page="reports" data-role-perm="reports">
          <i data-lucide="bar-chart-3" class="w-5 h-5"></i>
          <span>批量数据报表</span>
        </a>
      </nav>
      <div class="p-4 border-t border-[#1E293B]">
        <div class="security-card text-xs text-[#94A3B8] leading-relaxed">
          <div class="flex items-center gap-2 mb-2 text-[#60A5FA]">
            <i data-lucide="lock" class="w-4 h-4"></i>
            <span class="font-medium">数据安全说明</span>
          </div>
          <p>所有代码与PRD文档仅本地解析，不上传公域大模型。企业私有技术资产加密存储，操作记录可溯源。</p>
        </div>
      </div>
    </aside>
  `;

  // 插入到页面
  const container = document.getElementById('app-container');
  if (container) {
    container.insertAdjacentHTML('beforebegin', headerHtml);
    container.insertAdjacentHTML('beforebegin', sidebarHtml);
  }

  // 初始化图标
  if (window.lucide) {
    lucide.createIcons();
  }

  // 应用权限显隐
  applyRoleVisibility();
  initRoleSwitcher();
}

function isActive(pageName) {
  const path = window.location.pathname;
  if (pageName === 'index' && (path.endsWith('index.html') || path.endsWith('/'))) return 'active';
  if (path.includes(pageName)) return 'active';
  return '';
}

// 页面加载完成后渲染布局
document.addEventListener('DOMContentLoaded', renderLayout);
