/**
 * 权限系统模块
 * 定义三种角色及其权限，提供身份切换与权限校验功能
 */

const ROLES = {
  intern: {
    key: 'intern',
    name: '实习生',
    permissions: ['dashboard', 'code-review', 'prd-check'],
    canBatchUpload: false,
    canViewReports: false
  },
  developer: {
    key: 'developer',
    name: '普通开发',
    permissions: ['dashboard', 'code-review', 'prd-check'],
    canBatchUpload: true,
    canViewReports: false
  },
  cto: {
    key: 'cto',
    name: '技术总监',
    permissions: ['dashboard', 'code-review', 'prd-check', 'reports'],
    canBatchUpload: true,
    canViewReports: true
  }
};

const STORAGE_KEY = 'ccai_current_role';

function getCurrentRole() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && ROLES[stored]) {
    return ROLES[stored];
  }
  // 默认普通开发
  return ROLES.developer;
}

function setCurrentRole(roleKey) {
  if (ROLES[roleKey]) {
    localStorage.setItem(STORAGE_KEY, roleKey);
    return true;
  }
  return false;
}

function hasPermission(permission) {
  const role = getCurrentRole();
  return role.permissions.includes(permission);
}

function canBatchUpload() {
  return getCurrentRole().canBatchUpload;
}

function canViewReports() {
  return getCurrentRole().canViewReports;
}

/**
 * 根据当前角色动态显示/隐藏页面元素
 * 调用时机：页面加载完成后
 */
function applyRoleVisibility() {
  const role = getCurrentRole();

  // 控制导航项显示
  document.querySelectorAll('[data-role-perm]').forEach(el => {
    const perm = el.getAttribute('data-role-perm');
    if (role.permissions.includes(perm)) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  // 控制批量上传区域
  document.querySelectorAll('[data-require-batch]').forEach(el => {
    if (role.canBatchUpload) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  // 控制报表区域
  document.querySelectorAll('[data-require-report]').forEach(el => {
    if (role.canViewReports) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  // 更新顶部角色选择器
  const roleSelect = document.getElementById('role-selector');
  if (roleSelect) {
    roleSelect.value = role.key;
  }

  // 更新顶部角色名称显示
  const roleNameEl = document.getElementById('current-role-name');
  if (roleNameEl) {
    roleNameEl.textContent = role.name;
  }
}

/**
 * 初始化角色切换下拉框事件
 */
function initRoleSwitcher() {
  const roleSelect = document.getElementById('role-selector');
  if (!roleSelect) return;

  roleSelect.addEventListener('change', (e) => {
    const newRole = e.target.value;
    if (setCurrentRole(newRole)) {
      // 刷新页面以应用新权限
      window.location.reload();
    }
  });
}

// 导出（全局可用）
window.ROLES = ROLES;
window.getCurrentRole = getCurrentRole;
window.setCurrentRole = setCurrentRole;
window.hasPermission = hasPermission;
window.canBatchUpload = canBatchUpload;
window.canViewReports = canViewReports;
window.applyRoleVisibility = applyRoleVisibility;
window.initRoleSwitcher = initRoleSwitcher;
