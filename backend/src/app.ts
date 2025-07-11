import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import rateLimit from 'express-rate-limit';

// 导入路由
import authRoutes from '@/routes/auth';
import inquiryRoutes from '@/routes/inquiry';
import userRoutes from '@/routes/user';
import departmentRoutes from '@/routes/department';
import aiRoutes from '@/routes/ai';
import customFieldRoutes from '@/routes/customField';
import followUpRoutes from '@/routes/followUp';
import statisticsRoutes from '@/routes/statistics';

// 导入中间件
import { errorHandler } from '@/middleware/errorHandler';
import { authMiddleware } from '@/middleware/auth';
import { logger } from '@/utils/logger';

// 加载环境变量
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// 安全中间件
app.use(helmet());

// CORS配置
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:8000',
  credentials: true,
}));

// 请求日志
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// 请求限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    error: '请求过于频繁，请稍后再试'
  }
});
app.use('/api', limiter);

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API路由
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/departments', authMiddleware, departmentRoutes);
app.use('/api/inquiries', authMiddleware, inquiryRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);
app.use('/api/custom-fields', authMiddleware, customFieldRoutes);
app.use('/api/follow-ups', authMiddleware, followUpRoutes);
app.use('/api/statistics', authMiddleware, statisticsRoutes);

// 404处理
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: '接口不存在'
  });
});

// 错误处理中间件
app.use(errorHandler);

// 启动服务器
app.listen(PORT, () => {
  logger.info(`服务器运行在端口 ${PORT}`);
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
});

export default app;
