import express from 'express';
import compression from 'compression';
import { createClient } from 'redis';
import { logInfo, logError } from '@/utils/logger';

// Redis客户端
let redisClient: any = null;

// 初始化Redis连接
export const initRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
    });

    redisClient.on('error', (err: Error) => {
      logError('Redis connection error', err);
    });

    redisClient.on('connect', () => {
      logInfo('Redis connected successfully');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    logError('Failed to initialize Redis', error as Error);
    return null;
  }
};

// 获取Redis客户端
export const getRedisClient = () => redisClient;

// 压缩中间件
export const compressionMiddleware = compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
});

// 缓存中间件
export const cacheMiddleware = (duration: number = 300) => {
  return async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!redisClient || req.method !== 'GET') {
      return next();
    }

    const key = `cache:${req.originalUrl}:${JSON.stringify(req.query)}`;

    try {
      const cached = await redisClient.get(key);
      if (cached) {
        logInfo(`Cache hit for ${key}`);
        return res.json(JSON.parse(cached));
      }

      // 重写res.json方法以缓存响应
      const originalJson = res.json;
      res.json = function(data: any) {
        if (res.statusCode === 200 && data.success) {
          redisClient.setEx(key, duration, JSON.stringify(data)).catch((err: Error) => {
            logError('Failed to cache response', err);
          });
        }
        return originalJson.call(this, data);
      };

      next();
    } catch (error) {
      logError('Cache middleware error', error as Error);
      next();
    }
  };
};

// 请求时间记录中间件
export const requestTimingMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logData = {
      method: req.method,
      url: req.originalUrl,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      userAgent: req.get('User-Agent'),
      ip: req.ip,
    };

    if (duration > 1000) {
      logError('Slow request detected', new Error('Slow request'), logData);
    } else {
      logInfo('Request completed', logData);
    }
  });

  next();
};

// 内存使用监控
export const memoryMonitoringMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const memUsage = process.memoryUsage();
  const memUsageMB = {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024),
  };

  // 如果内存使用超过阈值，记录警告
  if (memUsageMB.heapUsed > 500) { // 500MB
    logError('High memory usage detected', new Error('High memory usage'), {
      memoryUsage: memUsageMB,
      url: req.originalUrl,
    });
  }

  // 添加内存使用信息到响应头（仅开发环境）
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('X-Memory-Usage', JSON.stringify(memUsageMB));
  }

  next();
};

// 数据库连接池监控
export const dbPoolMonitoringMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  // 这里可以添加数据库连接池监控逻辑
  // 由于使用Prisma，连接池由Prisma管理
  next();
};

// 清理过期缓存的定时任务
export const startCacheCleanupTask = () => {
  if (!redisClient) return;

  setInterval(async () => {
    try {
      const keys = await redisClient.keys('cache:*');
      logInfo(`Cache cleanup task: found ${keys.length} cache keys`);
      
      // 这里可以添加更复杂的清理逻辑
      // 例如：清理超过一定时间的缓存、清理使用频率低的缓存等
    } catch (error) {
      logError('Cache cleanup task error', error as Error);
    }
  }, 60 * 60 * 1000); // 每小时执行一次
};

// 性能指标收集
interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  errorCount: number;
  cacheHitRate: number;
  memoryUsage: any;
}

let performanceMetrics: PerformanceMetrics = {
  requestCount: 0,
  averageResponseTime: 0,
  errorCount: 0,
  cacheHitRate: 0,
  memoryUsage: {},
};

export const performanceMetricsMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const startTime = Date.now();
  performanceMetrics.requestCount++;

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    
    // 更新平均响应时间
    performanceMetrics.averageResponseTime = 
      (performanceMetrics.averageResponseTime + duration) / 2;

    // 统计错误
    if (res.statusCode >= 400) {
      performanceMetrics.errorCount++;
    }

    // 更新内存使用
    performanceMetrics.memoryUsage = process.memoryUsage();
  });

  next();
};

// 获取性能指标
export const getPerformanceMetrics = (): PerformanceMetrics => {
  return { ...performanceMetrics };
};

// 重置性能指标
export const resetPerformanceMetrics = () => {
  performanceMetrics = {
    requestCount: 0,
    averageResponseTime: 0,
    errorCount: 0,
    cacheHitRate: 0,
    memoryUsage: {},
  };
};

// 健康检查端点数据
export const getHealthCheckData = async () => {
  const memUsage = process.memoryUsage();
  const uptime = process.uptime();
  
  let redisStatus = 'disconnected';
  try {
    if (redisClient) {
      await redisClient.ping();
      redisStatus = 'connected';
    }
  } catch (error) {
    redisStatus = 'error';
  }

  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(uptime),
    memory: {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    },
    redis: redisStatus,
    performance: performanceMetrics,
  };
};
