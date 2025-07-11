import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler, AppError } from '@/middleware/errorHandler';
import { requireManagerOrAdmin } from '@/middleware/auth';
import { CustomFieldService } from '@/services/customFieldService';

const router = express.Router();

// 验证请求参数的中间件
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(`参数验证失败: ${errors.array().map(err => err.msg).join(', ')}`, 400);
  }
  next();
};

// 获取自定义字段定义列表
router.get('/definitions', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数'),
  query('search').optional().isString().withMessage('搜索关键词必须是字符串'),
  query('fieldType').optional().isIn(['text', 'number', 'date', 'datetime', 'select', 'multiselect', 'boolean', 'textarea']).withMessage('字段类型参数无效'),
  query('status').optional().isIn(['active', 'inactive']).withMessage('状态参数无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    search,
    fieldType,
    status,
  } = req.query;

  const result = await CustomFieldService.getCustomFieldList({
    page: Number(page),
    pageSize: Number(pageSize),
    search: search as string,
    fieldType: fieldType as any,
    status: status as any,
  });

  res.json({
    success: true,
    message: '获取自定义字段定义列表成功',
    data: result
  });
}));

// 获取所有激活的自定义字段
router.get('/definitions/active', asyncHandler(async (req, res) => {
  const fields = await CustomFieldService.getActiveCustomFields();

  res.json({
    success: true,
    message: '获取激活的自定义字段成功',
    data: fields
  });
}));

// 创建自定义字段定义（管理员或经理权限）
router.post('/definitions', requireManagerOrAdmin, [
  body('fieldName').isLength({ min: 1, max: 100 }).withMessage('字段名称长度1-100位'),
  body('fieldKey').isLength({ min: 1, max: 100 }).withMessage('字段键名长度1-100位'),
  body('fieldType').isIn(['text', 'number', 'date', 'datetime', 'select', 'multiselect', 'boolean', 'textarea']).withMessage('字段类型参数无效'),
  body('fieldOptions').optional().isArray().withMessage('字段选项必须是数组'),
  body('isRequired').optional().isBoolean().withMessage('是否必填必须是布尔值'),
  body('isSearchable').optional().isBoolean().withMessage('是否可搜索必须是布尔值'),
  body('displayOrder').optional().isInt().withMessage('显示顺序必须是整数'),
  body('description').optional().isString().withMessage('描述必须是字符串'),
], validateRequest, asyncHandler(async (req, res) => {
  const {
    fieldName,
    fieldKey,
    fieldType,
    fieldOptions,
    defaultValue,
    isRequired,
    isSearchable,
    displayOrder,
    validationRules,
    description,
    status,
  } = req.body;

  const user = req.user!;

  const field = await CustomFieldService.createCustomField({
    fieldName,
    fieldKey,
    fieldType,
    fieldOptions,
    defaultValue,
    isRequired,
    isSearchable,
    displayOrder,
    validationRules,
    description,
    status,
    createdBy: user.id,
  });

  res.status(201).json({
    success: true,
    message: '创建自定义字段定义成功',
    data: field
  });
}));

// 更新自定义字段定义（管理员或经理权限）
router.put('/definitions/:id', requireManagerOrAdmin, [
  param('id').isInt().withMessage('字段ID必须是整数'),
  body('fieldName').optional().isLength({ min: 1, max: 100 }).withMessage('字段名称长度1-100位'),
  body('fieldType').optional().isIn(['text', 'number', 'date', 'datetime', 'select', 'multiselect', 'boolean', 'textarea']).withMessage('字段类型参数无效'),
  body('fieldOptions').optional().isArray().withMessage('字段选项必须是数组'),
  body('isRequired').optional().isBoolean().withMessage('是否必填必须是布尔值'),
  body('isSearchable').optional().isBoolean().withMessage('是否可搜索必须是布尔值'),
  body('displayOrder').optional().isInt().withMessage('显示顺序必须是整数'),
  body('status').optional().isIn(['active', 'inactive']).withMessage('状态参数无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const fieldId = parseInt(req.params.id);
  const updateData = req.body;

  const field = await CustomFieldService.updateCustomField(fieldId, updateData);

  res.json({
    success: true,
    message: '更新自定义字段定义成功',
    data: field
  });
}));

// 删除自定义字段定义（管理员或经理权限）
router.delete('/definitions/:id', requireManagerOrAdmin, [
  param('id').isInt().withMessage('字段ID必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const fieldId = parseInt(req.params.id);

  await CustomFieldService.deleteCustomField(fieldId);

  res.json({
    success: true,
    message: '删除自定义字段定义成功',
    data: null
  });
}));

// 获取用户自定义字段配置
router.get('/user-configs', asyncHandler(async (req, res) => {
  const user = req.user!;
  const configs = await CustomFieldService.getUserCustomFieldConfigs(user.id);

  res.json({
    success: true,
    message: '获取用户自定义字段配置成功',
    data: configs
  });
}));

// 获取用户可见的自定义字段
router.get('/user-visible', asyncHandler(async (req, res) => {
  const user = req.user!;
  const fields = await CustomFieldService.getUserVisibleCustomFields(user.id);

  res.json({
    success: true,
    message: '获取用户可见字段成功',
    data: fields
  });
}));

// 更新用户自定义字段配置
router.put('/user-configs', [
  body('configs').isArray().withMessage('configs必须是数组'),
  body('configs.*.fieldId').isInt().withMessage('fieldId必须是整数'),
  body('configs.*.isVisible').isBoolean().withMessage('isVisible必须是布尔值'),
  body('configs.*.displayOrder').isInt().withMessage('displayOrder必须是整数'),
  body('configs.*.columnWidth').optional().isInt().withMessage('columnWidth必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const user = req.user!;
  const { configs } = req.body;

  await CustomFieldService.updateUserCustomFieldConfigs(user.id, configs);

  res.json({
    success: true,
    message: '更新用户自定义字段配置成功',
    data: null
  });
}));

// 重置用户自定义字段配置为默认值
router.post('/user-configs/reset', asyncHandler(async (req, res) => {
  const user = req.user!;

  await CustomFieldService.resetUserCustomFieldConfigs(user.id);

  res.json({
    success: true,
    message: '重置用户自定义字段配置成功',
    data: null
  });
}));

export default router;
