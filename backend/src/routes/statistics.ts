import express from 'express';
import { query, validationResult } from 'express-validator';
import { asyncHandler, AppError } from '@/middleware/errorHandler';
import { StatisticsService } from '@/services/statisticsService';
import prisma from '@/utils/database';

const router = express.Router();

// 验证请求参数的中间件
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(`参数验证失败: ${errors.array().map(err => err.msg).join(', ')}`, 400);
  }
  next();
};

// 获取仪表板数据
router.get('/dashboard', [
  query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
  query('departmentId').optional().isInt().withMessage('部门ID必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const { startDate, endDate, departmentId } = req.query;
  const user = req.user!;

  const dashboardData = await StatisticsService.getDashboardData({
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    departmentId: departmentId ? Number(departmentId) : user.departmentId,
    userId: user.id,
    userRole: user.role,
  });

  res.json({
    success: true,
    message: '获取仪表板数据成功',
    data: dashboardData
  });
}));

// 获取询盘统计
router.get('/inquiries', [
  query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
  query('departmentId').optional().isInt().withMessage('部门ID必须是整数'),
  query('userId').optional().isInt().withMessage('用户ID必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const { startDate, endDate, departmentId, userId } = req.query;
  const currentUser = req.user!;

  // 权限检查：只有管理员和经理可以查看其他用户的统计
  let targetUserId: number | undefined;
  let targetDepartmentId: number | undefined;

  if (currentUser.role === 'admin') {
    // 管理员可以查看任何用户/部门的统计
    targetUserId = userId ? Number(userId) : undefined;
    targetDepartmentId = departmentId ? Number(departmentId) : undefined;
  } else if (currentUser.role === 'manager') {
    // 经理只能查看本部门的统计
    targetDepartmentId = currentUser.departmentId;
    if (userId) {
      // 验证用户是否属于本部门
      const user = await prisma.user.findUnique({
        where: { id: Number(userId) },
        select: { departmentId: true },
      });
      if (user?.departmentId === currentUser.departmentId) {
        targetUserId = Number(userId);
      }
    }
  } else {
    // 其他角色只能查看自己的统计
    targetUserId = currentUser.id;
  }

  const statistics = await StatisticsService.getInquiryStatistics({
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    departmentId: targetDepartmentId,
    userId: targetUserId,
    userRole: currentUser.role,
  });

  res.json({
    success: true,
    message: '获取询盘统计成功',
    data: statistics
  });
}));

// 获取用户绩效统计
router.get('/user-performance', [
  query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
  query('departmentId').optional().isInt().withMessage('部门ID必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const { startDate, endDate, departmentId } = req.query;
  const user = req.user!;

  // 权限检查：只有管理员和经理可以查看绩效统计
  if (user.role !== 'admin' && user.role !== 'manager') {
    throw new AppError('无权查看绩效统计', 403);
  }

  let targetDepartmentId: number | undefined;
  if (user.role === 'admin') {
    targetDepartmentId = departmentId ? Number(departmentId) : undefined;
  } else {
    // 经理只能查看本部门的绩效
    targetDepartmentId = user.departmentId;
  }

  const userPerformance = await StatisticsService.getUserPerformance({
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    departmentId: targetDepartmentId,
    userRole: user.role,
  });

  res.json({
    success: true,
    message: '获取用户绩效统计成功',
    data: userPerformance
  });
}));

// 获取部门绩效统计
router.get('/department-performance', [
  query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const user = req.user!;

  // 权限检查：只有管理员可以查看部门绩效统计
  if (user.role !== 'admin') {
    throw new AppError('无权查看部门绩效统计', 403);
  }

  const departmentPerformance = await StatisticsService.getDepartmentPerformance({
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    userRole: user.role,
  });

  res.json({
    success: true,
    message: '获取部门绩效统计成功',
    data: departmentPerformance
  });
}));

// 导出统计数据
router.get('/export', [
  query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
  query('departmentId').optional().isInt().withMessage('部门ID必须是整数'),
  query('format').optional().isIn(['excel', 'csv']).withMessage('导出格式参数无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const { startDate, endDate, departmentId, format = 'excel' } = req.query;
  const user = req.user!;

  // 权限检查
  let targetDepartmentId: number | undefined;
  if (user.role === 'admin') {
    targetDepartmentId = departmentId ? Number(departmentId) : undefined;
  } else if (user.role === 'manager') {
    targetDepartmentId = user.departmentId;
  } else {
    throw new AppError('无权导出统计数据', 403);
  }

  const buffer = await StatisticsService.exportStatistics({
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    departmentId: targetDepartmentId,
    userId: user.id,
    userRole: user.role,
  }, format as 'excel' | 'csv');

  const filename = `statistics_${new Date().toISOString().split('T')[0]}.${format}`;
  const contentType = format === 'excel' 
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'text/csv';

  res.setHeader('Content-Type', contentType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(buffer);
}));

export default router;
