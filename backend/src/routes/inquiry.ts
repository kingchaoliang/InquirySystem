import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler, AppError } from '@/middleware/errorHandler';
import { checkDataPermission } from '@/middleware/auth';
import { InquiryService } from '@/services/inquiryService';

const router = express.Router();

// 验证请求参数的中间件
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(`参数验证失败: ${errors.array().map(err => err.msg).join(', ')}`, 400);
  }
  next();
};

// 获取询盘列表
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数'),
  query('status').optional().isIn(['new', 'contacted', 'quoted', 'negotiating', 'won', 'lost', 'closed']).withMessage('状态参数无效'),
  query('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('优先级参数无效'),
  query('assignedTo').optional().isInt().withMessage('分配人员ID必须是整数'),
  query('departmentId').optional().isInt().withMessage('部门ID必须是整数'),
  query('sourceChannel').optional().isString().withMessage('来源渠道必须是字符串'),
  query('customerType').optional().isIn(['individual', 'enterprise', 'government', 'other']).withMessage('客户类型参数无效'),
  query('search').optional().isString().withMessage('搜索关键词必须是字符串'),
  query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    search,
    status,
    priority,
    assignedTo,
    departmentId,
    sourceChannel,
    customerType,
    startDate,
    endDate,
  } = req.query;

  const user = req.user!;

  const result = await InquiryService.getInquiryList({
    page: Number(page),
    pageSize: Number(pageSize),
    search: search as string,
    status: status as any,
    priority: priority as any,
    assignedTo: assignedTo ? Number(assignedTo) : undefined,
    departmentId: departmentId ? Number(departmentId) : undefined,
    sourceChannel: sourceChannel as string,
    customerType: customerType as any,
    startDate: startDate as string,
    endDate: endDate as string,
    userId: user.id,
    userRole: user.role,
    userDepartmentId: user.departmentId,
  });

  res.json({
    success: true,
    message: '获取询盘列表成功',
    data: result
  });
}));

// 创建询盘
router.post('/', [
  body('title').isLength({ min: 1, max: 200 }).withMessage('标题长度1-200位'),
  body('content').notEmpty().withMessage('询盘内容不能为空'),
  body('sourceChannel').notEmpty().withMessage('来源渠道不能为空'),
  body('customerName').isLength({ min: 1, max: 100 }).withMessage('客户姓名长度1-100位'),
  body('customerEmail').optional().isEmail().withMessage('请输入有效的邮箱地址'),
  body('customerPhone').optional().isString().withMessage('电话号码必须是字符串'),
  body('customerCompany').optional().isString().withMessage('客户公司必须是字符串'),
  body('customerAddress').optional().isString().withMessage('客户地址必须是字符串'),
  body('customerType').optional().isIn(['individual', 'enterprise', 'government', 'other']).withMessage('客户类型参数无效'),
  body('region').optional().isString().withMessage('地区必须是字符串'),
  body('country').optional().isString().withMessage('国家必须是字符串'),
  body('assignedTo').optional().isInt().withMessage('分配人员ID必须是整数'),
  body('departmentId').optional().isInt().withMessage('部门ID必须是整数'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('优先级参数无效'),
  body('estimatedValue').optional().isDecimal().withMessage('预估价值必须是数字'),
  body('currency').optional().isLength({ max: 10 }).withMessage('货币代码最多10个字符'),
  body('expectedCloseDate').optional().isISO8601().withMessage('预期成交日期格式无效'),
  body('tags').optional().isArray().withMessage('标签必须是数组'),
  body('customFields').optional().isObject().withMessage('自定义字段必须是对象'),
], validateRequest, asyncHandler(async (req, res) => {
  const {
    title,
    content,
    sourceChannel,
    customerName,
    customerEmail,
    customerPhone,
    customerCompany,
    customerAddress,
    customerType,
    region,
    country,
    assignedTo,
    departmentId,
    priority,
    estimatedValue,
    currency,
    expectedCloseDate,
    tags,
    customFields,
  } = req.body;

  const user = req.user!;

  const inquiry = await InquiryService.createInquiry({
    title,
    content,
    sourceChannel,
    customerName,
    customerEmail,
    customerPhone,
    customerCompany,
    customerAddress,
    customerType,
    region,
    country,
    assignedTo,
    departmentId,
    priority,
    estimatedValue: estimatedValue ? parseFloat(estimatedValue) : undefined,
    currency,
    expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
    tags,
    customFields,
    createdBy: user.id,
  });

  res.status(201).json({
    success: true,
    message: '创建询盘成功',
    data: inquiry
  });
}));

// 获取询盘详情
router.get('/:id', [
  param('id').isInt().withMessage('询盘ID必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const inquiryId = parseInt(req.params.id);
  const user = req.user!;

  const inquiry = await InquiryService.getInquiryById(inquiryId, user.id, user.role);

  if (!inquiry) {
    throw new AppError('询盘不存在', 404);
  }

  res.json({
    success: true,
    message: '获取询盘详情成功',
    data: inquiry
  });
}));

// 更新询盘
router.put('/:id', [
  param('id').isInt().withMessage('询盘ID必须是整数'),
  body('title').optional().isLength({ min: 1, max: 200 }).withMessage('标题长度1-200位'),
  body('content').optional().notEmpty().withMessage('询盘内容不能为空'),
  body('sourceChannel').optional().notEmpty().withMessage('来源渠道不能为空'),
  body('customerName').optional().isLength({ min: 1, max: 100 }).withMessage('客户姓名长度1-100位'),
  body('customerEmail').optional().isEmail().withMessage('请输入有效的邮箱地址'),
  body('customerPhone').optional().isString().withMessage('电话号码必须是字符串'),
  body('customerCompany').optional().isString().withMessage('客户公司必须是字符串'),
  body('customerAddress').optional().isString().withMessage('客户地址必须是字符串'),
  body('customerType').optional().isIn(['individual', 'enterprise', 'government', 'other']).withMessage('客户类型参数无效'),
  body('region').optional().isString().withMessage('地区必须是字符串'),
  body('country').optional().isString().withMessage('国家必须是字符串'),
  body('assignedTo').optional().isInt().withMessage('分配人员ID必须是整数'),
  body('departmentId').optional().isInt().withMessage('部门ID必须是整数'),
  body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('优先级参数无效'),
  body('status').optional().isIn(['new', 'contacted', 'quoted', 'negotiating', 'won', 'lost', 'closed']).withMessage('状态参数无效'),
  body('estimatedValue').optional().isDecimal().withMessage('预估价值必须是数字'),
  body('currency').optional().isLength({ max: 10 }).withMessage('货币代码最多10个字符'),
  body('expectedCloseDate').optional().isISO8601().withMessage('预期成交日期格式无效'),
  body('tags').optional().isArray().withMessage('标签必须是数组'),
  body('customFields').optional().isObject().withMessage('自定义字段必须是对象'),
], validateRequest, asyncHandler(async (req, res) => {
  const inquiryId = parseInt(req.params.id);
  const user = req.user!;

  const inquiry = await InquiryService.updateInquiry(inquiryId, {
    ...req.body,
    estimatedValue: req.body.estimatedValue ? parseFloat(req.body.estimatedValue) : undefined,
    expectedCloseDate: req.body.expectedCloseDate ? new Date(req.body.expectedCloseDate) : undefined,
  }, user.id, user.role);

  res.json({
    success: true,
    message: '更新询盘成功',
    data: inquiry
  });
}));

// 删除询盘
router.delete('/:id', [
  param('id').isInt().withMessage('询盘ID必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const inquiryId = parseInt(req.params.id);
  const user = req.user!;

  await InquiryService.deleteInquiry(inquiryId, user.id, user.role);

  res.json({
    success: true,
    message: '删除询盘成功',
    data: null
  });
}));

// 批量更新询盘
router.patch('/batch', [
  body('ids').isArray().withMessage('ids必须是数组'),
  body('ids.*').isInt().withMessage('id必须是整数'),
  body('action').isIn(['assign', 'updateStatus', 'delete']).withMessage('无效的操作类型'),
  body('data').optional().isObject().withMessage('操作数据必须是对象'),
], validateRequest, asyncHandler(async (req, res) => {
  const { ids, action, data } = req.body;
  const user = req.user!;

  await InquiryService.batchUpdateInquiries(ids, action, data, user.id, user.role);

  res.json({
    success: true,
    message: '批量操作成功',
    data: null
  });
}));

// 导出询盘数据
router.get('/export/excel', [
  query('status').optional().isIn(['new', 'contacted', 'quoted', 'negotiating', 'won', 'lost', 'closed']).withMessage('状态参数无效'),
  query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
], validateRequest, asyncHandler(async (req, res) => {
  // TODO: 实现导出询盘数据逻辑
  res.json({
    success: true,
    message: '导出功能待实现',
    data: null
  });
}));

export default router;
