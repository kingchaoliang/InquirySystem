import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '@/utils/database';
import { AppError } from './errorHandler';
import { CryptoUtils } from '@/utils/crypto';

// 扩展Request接口
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        username: string;
        email: string;
        fullName: string;
        role: string;
        departmentId?: number;
      };
    }
  }
}

// JWT认证中间件
export const authMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // 获取token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError('未提供访问令牌', 401);
    }

    const token = authHeader.substring(7);

    // 验证token
    const decoded = CryptoUtils.verifyToken(token) as any;

    // 查询用户信息
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        departmentId: true,
        status: true,
      },
    });

    if (!user) {
      throw new AppError('用户不存在', 401);
    }

    if (user.status !== 'active') {
      throw new AppError('用户账户已被禁用', 401);
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user.id,
      username: user.username,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      departmentId: user.departmentId || undefined,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError('无效的访问令牌', 401));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(new AppError('访问令牌已过期', 401));
    } else {
      next(error);
    }
  }
};

// 角色权限检查中间件
export const requireRole = (roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(new AppError('未认证用户', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(new AppError('权限不足', 403));
    }

    next();
  };
};

// 管理员权限检查
export const requireAdmin = requireRole(['admin']);

// 管理员或经理权限检查
export const requireManagerOrAdmin = requireRole(['admin', 'manager']);

// 数据权限检查中间件
export const checkDataPermission = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const user = req.user!;
    const resourceId = parseInt(req.params.id);

    // 管理员可以访问所有数据
    if (user.role === 'admin') {
      return next();
    }

    // 根据不同的资源类型检查权限
    const resourceType = req.route.path.split('/')[1]; // 获取资源类型

    switch (resourceType) {
      case 'inquiries':
        const inquiry = await prisma.inquiry.findUnique({
          where: { id: resourceId },
          select: { assignedTo: true, departmentId: true, createdBy: true },
        });

        if (!inquiry) {
          return next(new AppError('询盘不存在', 404));
        }

        // 经理可以访问本部门的数据
        if (user.role === 'manager' && inquiry.departmentId === user.departmentId) {
          return next();
        }

        // 销售人员只能访问分配给自己或自己创建的询盘
        if (
          user.role === 'sales' &&
          (inquiry.assignedTo === user.id || inquiry.createdBy === user.id)
        ) {
          return next();
        }

        return next(new AppError('无权访问此资源', 403));

      default:
        return next();
    }
  } catch (error) {
    next(error);
  }
};
