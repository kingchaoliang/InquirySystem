import { Request, Response, NextFunction } from 'express';
import { logError } from '@/utils/logger';

// 自定义错误类
export class AppError extends Error {
  public statusCode: number;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// 错误处理中间件
export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  let statusCode = 500;
  let message = '服务器内部错误';

  // 处理自定义错误
  if (error instanceof AppError) {
    statusCode = error.statusCode;
    message = error.message;
  }

  // 处理Prisma错误
  if (error.name === 'PrismaClientKnownRequestError') {
    const prismaError = error as any;
    switch (prismaError.code) {
      case 'P2002':
        statusCode = 409;
        message = '数据已存在，违反唯一约束';
        break;
      case 'P2025':
        statusCode = 404;
        message = '记录不存在';
        break;
      case 'P2003':
        statusCode = 400;
        message = '外键约束失败';
        break;
      default:
        statusCode = 400;
        message = '数据库操作失败';
    }
  }

  // 处理验证错误
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = '数据验证失败';
  }

  // 处理JWT错误
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的访问令牌';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '访问令牌已过期';
  }

  // 记录错误日志
  logError(`${req.method} ${req.path}`, error, {
    statusCode,
    userId: (req as any).user?.id,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // 返回错误响应
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && {
      stack: error.stack,
      error: error.message,
    }),
  });
};

// 404处理中间件
export const notFoundHandler = (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `路由 ${req.originalUrl} 不存在`,
  });
};

// 异步错误捕获包装器
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
