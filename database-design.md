# AI询盘管理CRM系统 - 数据库设计

## 数据库概述
- **数据库类型**: MySQL 8.0+
- **ORM**: Prisma
- **字符集**: utf8mb4
- **排序规则**: utf8mb4_unicode_ci

## 核心表结构设计

### 1. 用户表 (users)
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(50) UNIQUE NOT NULL COMMENT '用户名',
  email VARCHAR(100) UNIQUE NOT NULL COMMENT '邮箱',
  password_hash VARCHAR(255) NOT NULL COMMENT '密码哈希',
  full_name VARCHAR(100) NOT NULL COMMENT '真实姓名',
  role ENUM('admin', 'manager', 'sales', 'customer_service') NOT NULL DEFAULT 'sales' COMMENT '角色',
  department_id INT COMMENT '部门ID',
  phone VARCHAR(20) COMMENT '电话',
  avatar_url VARCHAR(255) COMMENT '头像URL',
  status ENUM('active', 'inactive', 'suspended') NOT NULL DEFAULT 'active' COMMENT '状态',
  last_login_at TIMESTAMP COMMENT '最后登录时间',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_email (email),
  INDEX idx_username (username),
  INDEX idx_department (department_id),
  INDEX idx_role (role)
) COMMENT='用户表';
```

### 2. 部门表 (departments)
```sql
CREATE TABLE departments (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL COMMENT '部门名称',
  description TEXT COMMENT '部门描述',
  parent_id INT COMMENT '父部门ID',
  manager_id INT COMMENT '部门经理ID',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_parent (parent_id),
  INDEX idx_manager (manager_id)
) COMMENT='部门表';
```

### 3. 询盘表 (inquiries)
```sql
CREATE TABLE inquiries (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inquiry_no VARCHAR(50) UNIQUE NOT NULL COMMENT '询盘编号',
  title VARCHAR(200) NOT NULL COMMENT '询盘标题',
  content TEXT NOT NULL COMMENT '询盘内容',
  source_channel VARCHAR(50) NOT NULL COMMENT '来源渠道',
  customer_name VARCHAR(100) NOT NULL COMMENT '客户姓名',
  customer_email VARCHAR(100) COMMENT '客户邮箱',
  customer_phone VARCHAR(20) COMMENT '客户电话',
  customer_company VARCHAR(200) COMMENT '客户公司',
  customer_address TEXT COMMENT '客户地址',
  customer_type ENUM('individual', 'enterprise', 'government', 'other') NOT NULL DEFAULT 'individual' COMMENT '客户类型',
  region VARCHAR(100) COMMENT '地区',
  country VARCHAR(100) COMMENT '国家',
  assigned_to INT COMMENT '分配给（业务员ID）',
  department_id INT COMMENT '所属部门',
  priority ENUM('low', 'medium', 'high', 'urgent') NOT NULL DEFAULT 'medium' COMMENT '优先级',
  status ENUM('new', 'contacted', 'quoted', 'negotiating', 'won', 'lost', 'closed') NOT NULL DEFAULT 'new' COMMENT '状态',
  estimated_value DECIMAL(15,2) COMMENT '预估价值',
  currency VARCHAR(10) DEFAULT 'USD' COMMENT '货币',
  expected_close_date DATE COMMENT '预期成交日期',
  ai_analysis_score DECIMAL(5,2) COMMENT 'AI分析评分',
  ai_analysis_summary TEXT COMMENT 'AI分析摘要',
  tags JSON COMMENT '标签',
  custom_fields JSON COMMENT '自定义字段数据',
  created_by INT NOT NULL COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_inquiry_no (inquiry_no),
  INDEX idx_customer_email (customer_email),
  INDEX idx_assigned_to (assigned_to),
  INDEX idx_department (department_id),
  INDEX idx_status (status),
  INDEX idx_source_channel (source_channel),
  INDEX idx_created_at (created_at),
  INDEX idx_region (region),
  FULLTEXT idx_content (title, content)
) COMMENT='询盘表';
```

### 4. 自定义字段定义表 (custom_field_definitions)
```sql
CREATE TABLE custom_field_definitions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  field_name VARCHAR(100) NOT NULL COMMENT '字段名称',
  field_key VARCHAR(100) NOT NULL COMMENT '字段键名',
  field_type ENUM('text', 'number', 'date', 'datetime', 'select', 'multiselect', 'boolean', 'textarea') NOT NULL COMMENT '字段类型',
  field_options JSON COMMENT '字段选项（用于select类型）',
  default_value TEXT COMMENT '默认值',
  is_required BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否必填',
  is_searchable BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否可搜索',
  display_order INT NOT NULL DEFAULT 0 COMMENT '显示顺序',
  validation_rules JSON COMMENT '验证规则',
  description TEXT COMMENT '字段描述',
  status ENUM('active', 'inactive') NOT NULL DEFAULT 'active' COMMENT '状态',
  created_by INT NOT NULL COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_field_key (field_key),
  INDEX idx_field_type (field_type),
  INDEX idx_display_order (display_order)
) COMMENT='自定义字段定义表';
```

### 5. 用户自定义字段配置表 (user_custom_field_configs)
```sql
CREATE TABLE user_custom_field_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL COMMENT '用户ID',
  field_id INT NOT NULL COMMENT '字段ID',
  is_visible BOOLEAN NOT NULL DEFAULT TRUE COMMENT '是否显示',
  display_order INT NOT NULL DEFAULT 0 COMMENT '显示顺序',
  column_width INT COMMENT '列宽度',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  UNIQUE KEY uk_user_field (user_id, field_id),
  INDEX idx_user_id (user_id),
  INDEX idx_display_order (display_order)
) COMMENT='用户自定义字段配置表';
```

### 6. 跟进记录表 (follow_up_records)
```sql
CREATE TABLE follow_up_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inquiry_id INT NOT NULL COMMENT '询盘ID',
  follow_up_type ENUM('phone', 'email', 'wechat', 'meeting', 'visit', 'other') NOT NULL COMMENT '跟进方式',
  content TEXT NOT NULL COMMENT '跟进内容',
  result ENUM('no_answer', 'interested', 'not_interested', 'need_more_info', 'quoted', 'negotiating', 'closed') COMMENT '跟进结果',
  next_follow_up_date DATETIME COMMENT '下次跟进时间',
  attachments JSON COMMENT '附件',
  created_by INT NOT NULL COMMENT '跟进人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_inquiry_id (inquiry_id),
  INDEX idx_created_by (created_by),
  INDEX idx_next_follow_up (next_follow_up_date),
  INDEX idx_created_at (created_at)
) COMMENT='跟进记录表';
```

### 7. AI分析记录表 (ai_analysis_records)
```sql
CREATE TABLE ai_analysis_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  inquiry_id INT NOT NULL COMMENT '询盘ID',
  ai_provider ENUM('openai', 'deepseek', 'gemini') NOT NULL COMMENT 'AI提供商',
  model_name VARCHAR(100) NOT NULL COMMENT '模型名称',
  analysis_type ENUM('content_analysis', 'intent_analysis', 'sentiment_analysis', 'recommendation') NOT NULL COMMENT '分析类型',
  input_data JSON NOT NULL COMMENT '输入数据',
  output_data JSON NOT NULL COMMENT '输出数据',
  confidence_score DECIMAL(5,2) COMMENT '置信度评分',
  processing_time_ms INT COMMENT '处理时间（毫秒）',
  cost_amount DECIMAL(10,6) COMMENT '成本金额',
  status ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'pending' COMMENT '状态',
  error_message TEXT COMMENT '错误信息',
  created_by INT NOT NULL COMMENT '创建人',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_inquiry_id (inquiry_id),
  INDEX idx_ai_provider (ai_provider),
  INDEX idx_analysis_type (analysis_type),
  INDEX idx_created_at (created_at)
) COMMENT='AI分析记录表';
```

### 8. 系统配置表 (system_configs)
```sql
CREATE TABLE system_configs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  config_key VARCHAR(100) UNIQUE NOT NULL COMMENT '配置键',
  config_value TEXT COMMENT '配置值',
  config_type ENUM('string', 'number', 'boolean', 'json') NOT NULL DEFAULT 'string' COMMENT '配置类型',
  description TEXT COMMENT '配置描述',
  is_encrypted BOOLEAN NOT NULL DEFAULT FALSE COMMENT '是否加密',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
  INDEX idx_config_key (config_key)
) COMMENT='系统配置表';
```

### 9. 操作日志表 (operation_logs)
```sql
CREATE TABLE operation_logs (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT COMMENT '操作用户ID',
  operation_type VARCHAR(50) NOT NULL COMMENT '操作类型',
  resource_type VARCHAR(50) NOT NULL COMMENT '资源类型',
  resource_id INT COMMENT '资源ID',
  operation_description TEXT COMMENT '操作描述',
  ip_address VARCHAR(45) COMMENT 'IP地址',
  user_agent TEXT COMMENT '用户代理',
  request_data JSON COMMENT '请求数据',
  response_data JSON COMMENT '响应数据',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  INDEX idx_user_id (user_id),
  INDEX idx_operation_type (operation_type),
  INDEX idx_resource_type (resource_type),
  INDEX idx_created_at (created_at)
) COMMENT='操作日志表';
```

## 外键关系

```sql
-- 用户表外键
ALTER TABLE users ADD CONSTRAINT fk_users_department 
  FOREIGN KEY (department_id) REFERENCES departments(id);

-- 部门表外键
ALTER TABLE departments ADD CONSTRAINT fk_departments_parent 
  FOREIGN KEY (parent_id) REFERENCES departments(id);
ALTER TABLE departments ADD CONSTRAINT fk_departments_manager 
  FOREIGN KEY (manager_id) REFERENCES users(id);

-- 询盘表外键
ALTER TABLE inquiries ADD CONSTRAINT fk_inquiries_assigned_to 
  FOREIGN KEY (assigned_to) REFERENCES users(id);
ALTER TABLE inquiries ADD CONSTRAINT fk_inquiries_department 
  FOREIGN KEY (department_id) REFERENCES departments(id);
ALTER TABLE inquiries ADD CONSTRAINT fk_inquiries_created_by 
  FOREIGN KEY (created_by) REFERENCES users(id);

-- 自定义字段配置外键
ALTER TABLE user_custom_field_configs ADD CONSTRAINT fk_user_configs_user 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE user_custom_field_configs ADD CONSTRAINT fk_user_configs_field 
  FOREIGN KEY (field_id) REFERENCES custom_field_definitions(id) ON DELETE CASCADE;

-- 跟进记录外键
ALTER TABLE follow_up_records ADD CONSTRAINT fk_follow_up_inquiry 
  FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE;
ALTER TABLE follow_up_records ADD CONSTRAINT fk_follow_up_created_by 
  FOREIGN KEY (created_by) REFERENCES users(id);

-- AI分析记录外键
ALTER TABLE ai_analysis_records ADD CONSTRAINT fk_ai_analysis_inquiry 
  FOREIGN KEY (inquiry_id) REFERENCES inquiries(id) ON DELETE CASCADE;
ALTER TABLE ai_analysis_records ADD CONSTRAINT fk_ai_analysis_created_by 
  FOREIGN KEY (created_by) REFERENCES users(id);
```

## 索引优化策略

### 1. 复合索引
```sql
-- 询盘查询优化
CREATE INDEX idx_inquiries_status_assigned ON inquiries(status, assigned_to);
CREATE INDEX idx_inquiries_department_created ON inquiries(department_id, created_at);
CREATE INDEX idx_inquiries_channel_status ON inquiries(source_channel, status);

-- 跟进记录查询优化
CREATE INDEX idx_follow_up_inquiry_created ON follow_up_records(inquiry_id, created_at);

-- AI分析记录查询优化
CREATE INDEX idx_ai_analysis_inquiry_type ON ai_analysis_records(inquiry_id, analysis_type);
```

### 2. 分区策略
```sql
-- 按月分区操作日志表（示例）
ALTER TABLE operation_logs PARTITION BY RANGE (YEAR(created_at) * 100 + MONTH(created_at)) (
  PARTITION p202401 VALUES LESS THAN (202402),
  PARTITION p202402 VALUES LESS THAN (202403),
  -- ... 更多分区
  PARTITION p_future VALUES LESS THAN MAXVALUE
);
```

## 数据字典

### 枚举值说明

#### 用户角色 (role)
- `admin`: 系统管理员
- `manager`: 销售经理
- `sales`: 销售人员
- `customer_service`: 客服人员

#### 询盘状态 (status)
- `new`: 新询盘
- `contacted`: 已联系
- `quoted`: 已报价
- `negotiating`: 谈判中
- `won`: 已成交
- `lost`: 已失败
- `closed`: 已关闭

#### 客户类型 (customer_type)
- `individual`: 个人客户
- `enterprise`: 企业客户
- `government`: 政府客户
- `other`: 其他

#### 优先级 (priority)
- `low`: 低
- `medium`: 中
- `high`: 高
- `urgent`: 紧急

## 性能优化建议

1. **查询优化**
   - 使用适当的索引
   - 避免SELECT *
   - 使用LIMIT分页
   - 合理使用JOIN

2. **存储优化**
   - JSON字段适度使用
   - 定期清理历史数据
   - 使用分区表

3. **缓存策略**
   - Redis缓存热点数据
   - 查询结果缓存
   - 会话缓存
