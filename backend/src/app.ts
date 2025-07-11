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
import {
  compressionMiddleware,
  requestTimingMiddleware,
  memoryMonitoringMiddleware,
  performanceMetricsMiddleware,
  initRedis,
  startCacheCleanupTask,
  getHealthCheckData
} from '@/middleware/performance';
import {
  generalRateLimit,
  loginRateLimit,
  apiRateLimit,
  suspiciousActivityMiddleware,
  requestSizeLimitMiddleware,
  sqlInjectionDetectionMiddleware,
  xssDetectionMiddleware,
  startSecurityMonitoring,
  getSecurityStats
} from '@/middleware/security';

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

// 性能中间件
app.use(compressionMiddleware);
app.use(requestTimingMiddleware);
app.use(memoryMonitoringMiddleware);
app.use(performanceMetricsMiddleware);

// 安全防护中间件
app.use(suspiciousActivityMiddleware);
app.use(requestSizeLimitMiddleware());
app.use(sqlInjectionDetectionMiddleware);
app.use(xssDetectionMiddleware);

// 请求日志
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim())
  }
}));

// 通用速率限制
app.use(generalRateLimit);

// API特定速率限制
app.use('/api', apiRateLimit);

// 登录速率限制
app.use('/api/auth/login', loginRateLimit);

// 解析JSON
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// 健康检查
app.get('/health', async (req, res) => {
  try {
    const healthData = await getHealthCheckData();
    res.json(healthData);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Health check failed',
      timestamp: new Date().toISOString(),
    });
  }
});

// 性能指标端点
app.get('/metrics', (req, res) => {
  const securityStats = getSecurityStats();
  res.json({
    security: securityStats,
    timestamp: new Date().toISOString(),
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

// 初始化服务
const initializeServices = async () => {
  try {
    // 初始化Redis
    await initRedis();

    // 启动缓存清理任务
    startCacheCleanupTask();

    // 启动安全监控
    startSecurityMonitoring();

    logger.info('All services initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize services', error);
  }
};

// 启动服务器
app.listen(PORT, async () => {
  logger.info(`服务器运行在端口 ${PORT}`);
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);

  // 初始化服务
  await initializeServices();
});

export default app;
