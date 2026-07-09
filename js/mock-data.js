/**
 * 模拟数据仓库
 * 内置演示素材：带漏洞的代码、有缺陷的PRD、报表数据
 */

// =================== 演示用 Python 代码（含多种漏洞） ===================
const DEMO_PYTHON_CODE = `import mysql.connector

def login_user(username, password):
    # 连接数据库
    conn = mysql.connector.connect(
        host="localhost",
        user="root",
        password="123456",
        database="app_db"
    )
    cursor = conn.cursor()
    
    # 查询用户信息（存在SQL注入风险）
    query = "SELECT * FROM users WHERE username='" + username + "' AND password='" + password + "'"
    cursor.execute(query)
    result = cursor.fetchone()
    
    if result:
        return {"success": True, "role": result[3]}
    return {"success": False}

def process_data(items):
    res = []
    for i in range(len(items)):
        for j in range(len(items)):
            if items[i] == items[j] and i != j:
                res.append(items[i])
    return res

def read_file(path):
    f = open(path, "r")
    data = f.read()
    return data

def admin_action(user):
    if user.get("is_admin") == True:
        return "executed"
    return "denied"

class userManager:
    def getUser(self, uid):
        pass
`;

// =================== 演示用 PRD 文档（含需求缺陷） ===================
// 已优化：确保包含规则库中的所有关键词，100%触发缺陷检测
const DEMO_PRD = `# 电商订单系统需求文档

## 1. 功能概述
本系统用于处理用户下单流程，需要支持多种支付方式，支付渠道由用户自由选择。

## 2. 下单流程
用户在商品详情页点击"立即购买"后，系统应跳转至订单确认页。用户填写收货地址并选择支付方式后，点击"提交订单"按钮，系统生成订单并扣减库存。若库存不足需提示用户。

## 3. 支付处理
用户选择支付渠道后，系统调用第三方支付接口。支付成功后更新订单状态。如果支付失败，系统应处理失败情况，具体处理方式待产品确认。

## 4. 库存管理
用户下单时扣减库存，取消订单时恢复库存。库存扣减与恢复的时序需要进一步明确。

## 5. 异常订单处理
系统应支持对异常订单的标记与处理，但未明确异常订单的定义标准与处理流程。

## 6. 管理员需求
管理员可以查看所有订单，修改订单金额，删除异常订单记录，且无审批流程限制。
`;

// =================== 代码缺陷规则库 ===================
const CODE_DEFECT_RULES = [
  // 高危
  {
    id: 'd1',
    level: 'high',
    title: '明文密码硬编码',
    pattern: /password\s*=\s*["'][^"']+["']/i,
    reason: '数据库密码以明文形式硬编码在源码中，一旦代码泄露将导致数据库直接被入侵。',
    fix: '将敏感配置抽取到环境变量或密钥管理服务中，如使用 os.environ.get("DB_PASSWORD")。'
  },
  {
    id: 'd2',
    level: 'high',
    title: 'SQL注入漏洞',
    pattern: /execute\s*\(\s*["'].*\+.*\)/,
    reason: '用户输入直接拼接到SQL语句中，攻击者可通过构造特殊输入篡改查询逻辑，窃取或破坏数据。',
    fix: '使用参数化查询（Prepared Statements），如 cursor.execute("SELECT * FROM users WHERE username=%s", (username,))。'
  },
  {
    id: 'd3',
    level: 'high',
    title: '接口越权漏洞',
    pattern: /is_admin.*==\s*True/,
    reason: '仅通过客户端传入的布尔值判断管理员权限，可被恶意篡改请求参数绕过权限校验。',
    fix: '在服务端基于当前登录用户的会话身份查询数据库或缓存中的权限角色，不依赖前端传入的权限标记。'
  },
  // 中危
  {
    id: 'd4',
    level: 'medium',
    title: '循环性能冗余',
    pattern: /for\s+\w+\s+in\s+range\(len\(\w+\)\)\):[\s\S]*?for\s+\w+\s+in\s+range\(len\(\w+\)\)\):/,
    reason: '嵌套循环遍历同一列表查找重复项，时间复杂度为O(n\u00B2)，大数据量时会导致严重性能下降。',
    fix: '使用集合（set）去重，如 return list(set(items))，可将复杂度降至O(n)。'
  },
  {
    id: 'd5',
    level: 'medium',
    title: '异常捕获缺失',
    pattern: /def\s+\w+\([^)]*\):[\s\S]*?\n(?:(?!\s*try:)[^\n]*\n)*?\s*(?:cursor\.|conn\.|f\.)/,
    reason: '数据库连接与文件操作未使用 try/except/finally 包裹，一旦发生异常将导致资源未释放。',
    fix: '使用 try...finally 或 with 语句确保资源关闭，如 with open(path, "r") as f:。'
  },
  {
    id: 'd6',
    level: 'medium',
    title: '资源未关闭',
    pattern: /=\s*open\([^)]+\)[^\n]*\n(?!.*close\(\))/,
    reason: '文件打开后未显式关闭，在长时间运行或高并发场景下可能耗尽系统文件描述符。',
    fix: '使用 with 语句自动管理资源生命周期，或在 finally 块中调用 f.close()。'
  },
  // 低危
  {
    id: 'd7',
    level: 'low',
    title: '命名不规范',
    pattern: /class\s+[a-z]\w*/,
    reason: '类名应使用大驼峰命名法（PascalCase），以符合 PEP8 规范并提升代码可读性。',
    fix: '将类名改为大驼峰，如 userManager -> UserManager。'
  },
  {
    id: 'd8',
    level: 'low',
    title: '注释缺失',
    pattern: /^\s*def\s+\w+\([^)]*\):\s*\n\s*[^#\s"']/m,
    reason: '公共函数缺少文档字符串（docstring），维护人员难以快速理解函数用途与参数含义。',
    fix: '为函数添加 docstring，说明功能、参数与返回值。'
  },
  {
    id: 'd9',
    level: 'low',
    title: '重复冗余代码',
    pattern: /\n\s*return\s+\{[^}]+\}\s*\n\s*return\s+\{[^}]+\}/,
    reason: '存在逻辑上不可达的死代码，或重复返回结构，增加维护成本。',
    fix: '清理不可达分支，统一返回结构。'
  }
];

// =================== PRD 缺陷规则库 ===================
const PRD_DEFECT_RULES = [
  {
    id: 'p1',
    level: 'high',
    title: '需求歧义：模糊描述',
    pattern: /多种支付方式|失败情况|异常订单/,
    reason: '"多种支付方式""失败情况"等描述未明确具体范围与处理逻辑，导致开发实现与产品预期存在偏差。',
    suggestion: '明确列出支持的支付方式（微信支付、支付宝、银联等），并定义每种支付失败后的重试策略与回滚逻辑。'
  },
  {
    id: 'p2',
    level: 'high',
    title: '缺少边界/异常流程',
    pattern: /库存|取消订单/,
    reason: '未描述库存扣减失败、并发超卖、支付超时、用户重复提交等边界场景的处理方案。',
    suggestion: '补充库存预扣、超时释放、幂等性校验、分布式锁等异常与边界流程说明。'
  },
  {
    id: 'p3',
    level: 'medium',
    title: '前后逻辑冲突',
    pattern: /修改订单金额|删除.*订单/,
    reason: '允许管理员修改订单金额与删除订单记录，与财务审计要求冲突，且未说明操作日志与审批流程。',
    suggestion: '增加金额修改的审批流与操作日志，或改为仅支持退款/补差模式；删除改为标记作废并保留记录。'
  }
];

// =================== 报表模拟数据 ===================
const REPORT_DATA = {
  defectPie: {
    labels: ['高危漏洞', '中危缺陷', '低危建议', '需求歧义', '边界缺失', '逻辑冲突'],
    data: [18, 32, 28, 12, 8, 6],
    colors: ['#EF4444', '#F97316', '#94A3B8', '#8B5CF6', '#3B82F6', '#10B981']
  },
  monthly: [
    { month: '2025-01', inspections: 124, highRisk: 8, prdDefects: 15 },
    { month: '2025-02', inspections: 156, highRisk: 12, prdDefects: 22 },
    { month: '2025-03', inspections: 189, highRisk: 15, prdDefects: 28 },
    { month: '2025-04', inspections: 210, highRisk: 18, prdDefects: 31 },
    { month: '2025-05', inspections: 245, highRisk: 14, prdDefects: 27 },
    { month: '2025-06', inspections: 268, highRisk: 22, prdDefects: 35 }
  ]
};

// =================== 自动拆分任务模拟数据 ===================
const DEMO_TASKS = {
  frontend: [
    { title: '订单确认页开发', desc: '收货地址选择、支付方式单选/多选组件、订单金额明细展示。' },
    { title: '支付结果页', desc: '支付成功/失败状态展示、重试按钮、返回首页入口。' },
    { title: '库存提示组件', desc: '商品详情页库存不足提示、下单页库存锁定倒计时。' }
  ],
  backend: [
    { title: '下单接口 /api/order/create', desc: '参数校验、库存预扣、订单号生成、调用支付网关。' },
    { title: '支付回调接口 /api/pay/callback', desc: '幂等性校验、订单状态机流转、库存确认扣减/释放。' },
    { title: '订单查询接口 /api/order/list', desc: '分页、状态筛选、权限隔离（用户仅看自己，管理员看全部）。' }
  ],
  test: [
    { title: 'TC-01: 正常下单支付', desc: '步骤：选商品->下单->支付成功->订单状态为已支付->库存扣减。' },
    { title: 'TC-02: 库存不足下单', desc: '步骤：选超库存数量->提交订单->系统提示库存不足->订单未生成。' },
    { title: 'TC-03: 支付超时取消', desc: '步骤：下单后超时未支付->系统自动取消->库存回滚->可重新下单。' },
    { title: 'TC-04: 重复支付幂等', desc: '步骤：支付成功后再次收到回调->订单状态不变->仅记录一次流水。' }
  ]
};

// 导出
window.DEMO_PYTHON_CODE = DEMO_PYTHON_CODE;
window.DEMO_PRD = DEMO_PRD;
window.CODE_DEFECT_RULES = CODE_DEFECT_RULES;
window.PRD_DEFECT_RULES = PRD_DEFECT_RULES;
window.REPORT_DATA = REPORT_DATA;
window.DEMO_TASKS = DEMO_TASKS;
