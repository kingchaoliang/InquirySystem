import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler, AppError } from '@/middleware/errorHandler';
import { requireAdmin, requireManagerOrAdmin } from '@/middleware/auth';
import { UserService } from '@/services/userService';
import { AuthService } from '@/services/authService';

const router = express.Router();

// 验证请求参数的中间件
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(`参数验证失败: ${errors.array().map(err => err.msg).join(', ')}`, 400);
  }
  next();
};

// 获取当前用户信息
router.get('/profile', asyncHandler(async (req, res) => {
  const user = await UserService.getUserById(req.user!.id);

  res.json({
    success: true,
    message: '获取用户信息成功',
    data: user
  });
}));

// 更新当前用户信息
router.put('/profile', [
  body('fullName').optional().isLength({ min: 2, max: 100 }).withMessage('真实姓名长度2-100位'),
  body('phone').optional().isMobilePhone('zh-CN').withMessage('请输入有效的手机号码'),
], validateRequest, asyncHandler(async (req, res) => {
  const { fullName, phone } = req.body;
  const userId = req.user!.id;

  const user = await UserService.updateUser(userId, { fullName, phone });

  res.json({
    success: true,
    message: '更新用户信息成功',
    data: user
  });
}));

// 获取用户列表（管理员或经理权限）
router.get('/', requireManagerOrAdmin, [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数'),
  query('search').optional().isString().withMessage('搜索关键词必须是字符串'),
  query('role').optional().isIn(['admin', 'manager', 'sales', 'customer_service']).withMessage('角色参数无效'),
  query('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('状态参数无效'),
  query('departmentId').optional().isInt({ min: 1 }).withMessage('部门ID必须是正整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    search,
    role,
    status,
    departmentId,
  } = req.query;

  const result = await UserService.getUserList({
    page: Number(page),
    pageSize: Number(pageSize),
    search: search as string,
    role: role as any,
    status: status as any,
    departmentId: departmentId ? Number(departmentId) : undefined,
  });

  res.json({
    success: true,
    message: '获取用户列表成功',
    data: result
  });
}));

// 创建用户（管理员权限）
router.post('/', requireAdmin, [
  body('username').isLength({ min: 3, max: 50 }).withMessage('用户名长度3-50位'),
  body('email').isEmail().withMessage('请输入有效的邮箱地址'),
  body('password').isLength({ min: 6 }).withMessage('密码至少6位'),
  body('fullName').isLength({ min: 2, max: 100 }).withMessage('真实姓名长度2-100位'),
  body('role').isIn(['admin', 'manager', 'sales', 'customer_service']).withMessage('角色参数无效'),
  body('phone').optional().isMobilePhone('zh-CN').withMessage('请输入有效的手机号码'),
  body('departmentId').optional().isInt({ min: 1 }).withMessage('部门ID必须是正整数'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('状态参数无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const { username, email, password, fullName, role, phone, departmentId, status } = req.body;

  const user = await UserService.createUser({
    username,
    email,
    password,
    fullName,
    role,
    phone,
    departmentId,
    status,
  });

  res.status(201).json({
    success: true,
    message: '创建用户成功',
    data: user
  });
}));

// 更新用户（管理员权限）
router.put('/:id', requireAdmin, [
  param('id').isInt().withMessage('用户ID必须是整数'),
  body('username').optional().isLength({ min: 3, max: 50 }).withMessage('用户名长度3-50位'),
  body('email').optional().isEmail().withMessage('请输入有效的邮箱地址'),
  body('fullName').optional().isLength({ min: 2, max: 100 }).withMessage('真实姓名长度2-100位'),
  body('role').optional().isIn(['admin', 'manager', 'sales', 'customer_service']).withMessage('角色参数无效'),
  body('phone').optional().isMobilePhone('zh-CN').withMessage('请输入有效的手机号码'),
  body('departmentId').optional().isInt({ min: 1 }).withMessage('部门ID必须是正整数'),
  body('status').optional().isIn(['active', 'inactive', 'suspended']).withMessage('状态参数无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const { username, email, fullName, role, phone, departmentId, status } = req.body;

  const user = await UserService.updateUser(userId, {
    username,
    email,
    fullName,
    role,
    phone,
    departmentId,
    status,
  });

  res.json({
    success: true,
    message: '更新用户成功',
    data: user
  });
}));

// 删除用户（管理员权限）
router.delete('/:id', requireAdmin, [
  param('id').isInt().withMessage('用户ID必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);

  await UserService.deleteUser(userId);

  res.json({
    success: true,
    message: '删除用户成功',
    data: null
  });
}));

// 重置用户密码（管理员权限）
router.put('/:id/reset-password', requireAdmin, [
  param('id').isInt().withMessage('用户ID必须是整数'),
  body('newPassword').isLength({ min: 6 }).withMessage('新密码至少6位'),
], validateRequest, asyncHandler(async (req, res) => {
  const userId = parseInt(req.params.id);
  const { newPassword } = req.body;

  await UserService.resetUserPassword(userId, newPassword);

  res.json({
    success: true,
    message: '重置密码成功',
    data: null
  });
}));

export default router;
