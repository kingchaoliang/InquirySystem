# AI询盘管理CRM系统

一个基于Ant Design Pro UI库的AI驱动询盘管理CRM系统，支持Docker部署，集成ChatGPT/deepseek/gemini AI分析功能，具备多角色权限管理和全面的询盘跟踪能力。

## 🚀 项目特性

### 核心功能
- **询盘管理**: 完整的询盘生命周期管理
- **可自定义表头**: 用户可自定义添加字段（跟进推广员、跟进状态等）
- **AI智能分析**: 集成多个AI平台进行询盘内容分析
- **多角色权限**: 基于RBAC的权限控制系统
- **跟进管理**: 完整的客户跟进记录和提醒系统
- **数据统计**: 丰富的报表和数据分析功能

### 技术特性
- **前端**: React + TypeScript + Ant Design Pro
- **后端**: Node.js + Express + Prisma ORM
- **数据库**: MySQL 8.0+
- **缓存**: Redis
- **容器化**: Docker + Docker Compose
- **AI集成**: OpenAI、DeepSeek、Gemini

## 📋 系统要求

- Node.js 18+
- Docker & Docker Compose
- MySQL 8.0+
- Redis 7+

## 🚀 快速开始

### 环境要求

- Node.js 18+
- PostgreSQL 15+
- Redis 6.0+
- Docker & Docker Compose (推荐)

### 一键启动（推荐）

```bash
# 克隆项目
git clone https://github.com/kingchaoliang/InquirySystem
cd InquirySystem

# 使用Docker一键启动
./scripts/start-system.sh docker
```

### 手动安装步骤

#### 1. 克隆项目
```bash
git clone https://github.com/kingchaoliang/InquirySystem
cd InquirySystem
```

#### 2. 环境配置
```bash
# 复制环境变量文件
cp .env.example .env

# 编辑环境变量（重要：配置数据库和AI API密钥）
vim .env
```

#### 3. 启动开发环境
```bash
# 使用启动脚本（自动安装依赖、初始化数据库）
./scripts/start-system.sh dev
```

#### 4. 或者手动启动
```bash
# 安装前端依赖
npm install

# 安装后端依赖
cd backend
npm install

# 数据库设置
npx prisma generate
npx prisma migrate deploy
npm run seed

# 启动后端服务
npm run dev

# 启动前端服务（新终端）
cd ..
npm run dev
```

### Docker 部署

```bash
# 使用Docker Compose启动所有服务
docker-compose up -d

# 或使用启动脚本
./scripts/start-system.sh docker

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 停止服务
docker-compose down
```

### 系统测试

```bash
# 运行完整系统测试
./scripts/start-system.sh test

# 单独运行数据库测试
./scripts/test-database.sh

# 单独运行API测试
./scripts/test-api.sh
```

## 📚 项目结构

```
inquiry-crm-system/
├── backend/                 # 后端代码
│   ├── src/
│   │   ├── controllers/     # 控制器
│   │   ├── middleware/      # 中间件
│   │   ├── routes/         # 路由
│   │   ├── services/       # 业务逻辑
│   │   ├── utils/          # 工具函数
│   │   └── app.ts          # 应用入口
│   ├── prisma/             # 数据库模型
│   ├── Dockerfile          # 后端Docker配置
│   └── package.json
├── src/                    # 前端代码
│   ├── components/         # 组件
│   ├── pages/             # 页面
│   ├── services/          # API服务
│   ├── utils/             # 工具函数
│   └── app.tsx            # 应用入口
├── nginx/                 # Nginx配置
├── docker-compose.yml     # Docker编排文件
├── .umirc.ts             # UmiJS配置
├── package.json          # 前端依赖
├── todo.md               # 开发计划
├── 讨论清单.md            # 需求讨论
└── README.md
```

## 🔧 开发指南

### 数据库操作
```bash
# 生成Prisma客户端
npx prisma generate

# 创建迁移
npx prisma migrate dev --name migration_name

# 重置数据库
npx prisma migrate reset

# 查看数据库
npx prisma studio
```

### 代码规范
```bash
# 前端代码检查
npm run lint

# 前端代码格式化
npm run prettier

# 后端代码检查
cd backend && npm run lint

# 后端代码格式化
cd backend && npm run lint:fix
```

### 测试
```bash
# 前端测试
npm run test

# 后端测试
cd backend && npm run test

# 测试覆盖率
cd backend && npm run test:coverage
```

## 🚀 部署指南

### 生产环境部署
1. 配置生产环境变量
2. 构建Docker镜像
3. 使用Docker Compose启动

```bash
# 设置生产环境
export NODE_ENV=production

# 启动生产环境
docker-compose -f docker-compose.yml up -d
```

### 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| NODE_ENV | 运行环境 | development |
| MYSQL_DATABASE | 数据库名 | inquiry_crm |
| MYSQL_USER | 数据库用户 | crm_user |
| MYSQL_PASSWORD | 数据库密码 | crm_password |
| JWT_SECRET | JWT密钥 | - |
| OPENAI_API_KEY | OpenAI API密钥 | - |
| DEEPSEEK_API_KEY | DeepSeek API密钥 | - |
| GEMINI_API_KEY | Gemini API密钥 | - |

## 📖 API文档

### 认证接口
- `POST /api/auth/login` - 用户登录
- `POST /api/auth/register` - 用户注册
- `POST /api/auth/logout` - 用户登出

### 询盘接口
- `GET /api/inquiries` - 获取询盘列表
- `POST /api/inquiries` - 创建询盘
- `GET /api/inquiries/:id` - 获取询盘详情
- `PUT /api/inquiries/:id` - 更新询盘
- `DELETE /api/inquiries/:id` - 删除询盘

### 自定义字段接口
- `GET /api/custom-fields` - 获取自定义字段列表
- `POST /api/custom-fields` - 创建自定义字段
- `PUT /api/custom-fields/:id` - 更新自定义字段
- `DELETE /api/custom-fields/:id` - 删除自定义字段

### AI分析接口
- `POST /api/ai/analyze` - 执行AI分析
- `GET /api/ai/history/:inquiryId` - 获取分析历史

## 🤝 贡献指南

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 📞 支持

如有问题或建议，请通过以下方式联系：

- 创建 Issue
- 发送邮件至 support@example.com

## 🗺️ 开发路线图

查看 [todo.md](todo.md) 了解详细的开发计划和进度。

### 当前版本 (v1.0.0)
- ✅ 项目基础架构
- ✅ 数据库设计与建模
- ✅ Docker容器化配置
- ✅ 前端项目结构搭建
- ✅ 后端API框架搭建
- ✅ 基础页面组件
- 🔄 用户认证系统（API接口已定义，待实现业务逻辑）
- ⏳ 询盘管理核心功能
- ⏳ 自定义字段系统
- ⏳ AI分析集成

### 下一版本 (v1.1.0)
- 📋 移动端适配
- 📋 高级报表功能
- 📋 批量操作功能
- 📋 数据导入导出

## 🙏 致谢

感谢以下开源项目：
- [Ant Design Pro](https://pro.ant.design/)
- [UmiJS](https://umijs.org/)
- [Prisma](https://www.prisma.io/)
- [Express](https://expressjs.com/)
