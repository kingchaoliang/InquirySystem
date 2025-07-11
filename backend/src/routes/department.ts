import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler, AppError } from '@/middleware/errorHandler';
import { requireAdmin, requireManagerOrAdmin } from '@/middleware/auth';
import { DepartmentService } from '@/services/departmentService';

const router = express.Router();

// 验证请求参数的中间件
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(`参数验证失败: ${errors.array().map(err => err.msg).join(', ')}`, 400);
  }
  next();
};

// 获取部门列表
router.get('/', requireManagerOrAdmin, [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数'),
  query('search').optional().isString().withMessage('搜索关键词必须是字符串'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('状态参数无效'),
  query('parentId').optional().isInt().withMessage('父部门ID必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    search,
    status,
    parentId,
  } = req.query;

  const result = await DepartmentService.getDepartmentList({
    page: Number(page),
    pageSize: Number(pageSize),
    search: search as string,
    status: status as any,
    parentId: parentId ? Number(parentId) : undefined,
  });

  res.json({
    success: true,
    message: '获取部门列表成功',
    data: result
  });
}));

// 获取部门树形结构
router.get('/tree', requireManagerOrAdmin, asyncHandler(async (req, res) => {
  const departments = await DepartmentService.getDepartmentTree();

  res.json({
    success: true,
    message: '获取部门树形结构成功',
    data: departments
  });
}));

// 获取部门详情
router.get('/:id', requireManagerOrAdmin, [
  param('id').isInt().withMessage('部门ID必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const departmentId = parseInt(req.params.id);
  const department = await DepartmentService.getDepartmentById(departmentId);

  if (!department) {
    throw new AppError('部门不存在', 404);
  }

  res.json({
    success: true,
    message: '获取部门详情成功',
    data: department
  });
}));

// 创建部门（管理员权限）
router.post('/', requireAdmin, [
  body('name').isLength({ min: 1, max: 100 }).withMessage('部门名称长度1-100位'),
  body('description').optional().isLength({ max: 500 }).withMessage('部门描述最多500字符'),
  body('parentId').optional().isInt({ min: 1 }).withMessage('父部门ID必须是正整数'),
  body('managerId').optional().isInt({ min: 1 }).withMessage('管理员ID必须是正整数'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态参数无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const { name, description, parentId, managerId, status } = req.body;

  const department = await DepartmentService.createDepartment({
    name,
    description,
    parentId,
    managerId,
    status,
  });

  res.status(201).json({
    success: true,
    message: '创建部门成功',
    data: department
  });
}));

// 更新部门（管理员权限）
router.put('/:id', requireAdmin, [
  param('id').isInt().withMessage('部门ID必须是整数'),
  body('name').optional().isLength({ min: 1, max: 100 }).withMessage('部门名称长度1-100位'),
  body('description').optional().isLength({ max: 500 }).withMessage('部门描述最多500字符'),
  body('parentId').optional().isInt().withMessage('父部门ID必须是整数'),
  body('managerId').optional().isInt().withMessage('管理员ID必须是整数'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态参数无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const departmentId = parseInt(req.params.id);
  const { name, description, parentId, managerId, status } = req.body;

  const department = await DepartmentService.updateDepartment(departmentId, {
    name,
    description,
    parentId,
    managerId,
    status,
  });

  res.json({
    success: true,
    message: '更新部门成功',
    data: department
  });
}));

// 删除部门（管理员权限）
router.delete('/:id', requireAdmin, [
  param('id').isInt().withMessage('部门ID必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const departmentId = parseInt(req.params.id);

  await DepartmentService.deleteDepartment(departmentId);

  res.json({
    success: true,
    message: '删除部门成功',
    data: null
  });
}));

export default router;
