import { PrismaClient } from '@prisma/client';
import { logInfo, logError } from './logger';

// 创建Prisma客户端实例
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// 监听数据库事件
prisma.$on('query', (e) => {
  if (process.env.NODE_ENV === 'development') {
    logInfo(`Query: ${e.query}`, { params: e.params, duration: e.duration });
  }
});

prisma.$on('error', (e) => {
  logError('Database error', new Error(e.message), { target: e.target });
});

prisma.$on('info', (e) => {
  logInfo(`Database info: ${e.message}`, { target: e.target });
});

prisma.$on('warn', (e) => {
  logInfo(`Database warning: ${e.message}`, { target: e.target });
});

// 数据库连接测试
export const testDatabaseConnection = async (): Promise<boolean> => {
  try {
    await prisma.$connect();
    logInfo('Database connection successful');
    return true;
  } catch (error) {
    logError('Database connection failed', error as Error);
    return false;
  }
};

// 优雅关闭数据库连接
export const closeDatabaseConnection = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logInfo('Database connection closed');
  } catch (error) {
    logError('Error closing database connection', error as Error);
  }
};

// 数据库健康检查
export const checkDatabaseHealth = async (): Promise<{
  status: 'healthy' | 'unhealthy';
  message: string;
  details?: any;
}> => {
  try {
    // 执行简单查询测试连接
    await prisma.$queryRaw`SELECT 1`;
    
    // 获取数据库统计信息
    const userCount = await prisma.user.count();
    const inquiryCount = await prisma.inquiry.count();
    
    return {
      status: 'healthy',
      message: 'Database is healthy',
      details: {
        userCount,
        inquiryCount,
        timestamp: new Date().toISOString(),
      },
    };
  } catch (error) {
    logError('Database health check failed', error as Error);
    return {
      status: 'unhealthy',
      message: 'Database health check failed',
      details: {
        error: (error as Error).message,
        timestamp: new Date().toISOString(),
      },
    };
  }
};

// 数据库事务辅助函数
export const withTransaction = async <T>(
  callback: (prisma: PrismaClient) => Promise<T>
): Promise<T> => {
  return prisma.$transaction(callback);
};

export default prisma;
