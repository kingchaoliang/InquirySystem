import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler, AppError } from '@/middleware/errorHandler';
import { FollowUpService } from '@/services/followUpService';

const router = express.Router();

// 验证请求参数的中间件
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(`参数验证失败: ${errors.array().map(err => err.msg).join(', ')}`, 400);
  }
  next();
};

// 获取跟进记录列表
router.get('/', [
  query('page').optional().isInt({ min: 1 }).withMessage('页码必须是正整数'),
  query('pageSize').optional().isInt({ min: 1, max: 100 }).withMessage('每页数量必须是1-100之间的整数'),
  query('inquiryId').optional().isInt().withMessage('询盘ID必须是整数'),
  query('followUpType').optional().isIn(['phone', 'email', 'wechat', 'meeting', 'visit', 'other']).withMessage('跟进类型参数无效'),
  query('result').optional().isIn(['no_answer', 'interested', 'not_interested', 'need_more_info', 'quoted', 'negotiating', 'closed']).withMessage('跟进结果参数无效'),
  query('createdBy').optional().isInt().withMessage('创建人ID必须是整数'),
  query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const {
    page = 1,
    pageSize = 20,
    inquiryId,
    followUpType,
    result,
    createdBy,
    startDate,
    endDate,
  } = req.query;

  const followUpList = await FollowUpService.getFollowUpList({
    page: Number(page),
    pageSize: Number(pageSize),
    inquiryId: inquiryId ? Number(inquiryId) : undefined,
    followUpType: followUpType as any,
    result: result as any,
    createdBy: createdBy ? Number(createdBy) : undefined,
    startDate: startDate as string,
    endDate: endDate as string,
  });

  res.json({
    success: true,
    message: '获取跟进记录列表成功',
    data: followUpList
  });
}));

// 获取跟进记录详情
router.get('/:id', [
  param('id').isInt().withMessage('跟进记录ID必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const followUpId = parseInt(req.params.id);
  const followUp = await FollowUpService.getFollowUpById(followUpId);

  if (!followUp) {
    throw new AppError('跟进记录不存在', 404);
  }

  res.json({
    success: true,
    message: '获取跟进记录详情成功',
    data: followUp
  });
}));

// 创建跟进记录
router.post('/', [
  body('inquiryId').isInt().withMessage('询盘ID必须是整数'),
  body('followUpType').isIn(['phone', 'email', 'wechat', 'meeting', 'visit', 'other']).withMessage('跟进类型参数无效'),
  body('content').notEmpty().withMessage('跟进内容不能为空'),
  body('result').optional().isIn(['no_answer', 'interested', 'not_interested', 'need_more_info', 'quoted', 'negotiating', 'closed']).withMessage('跟进结果参数无效'),
  body('nextFollowUpDate').optional().isISO8601().withMessage('下次跟进日期格式无效'),
  body('attachments').optional().isArray().withMessage('附件必须是数组'),
], validateRequest, asyncHandler(async (req, res) => {
  const {
    inquiryId,
    followUpType,
    content,
    result,
    nextFollowUpDate,
    attachments,
  } = req.body;

  const user = req.user!;

  const followUp = await FollowUpService.createFollowUp({
    inquiryId,
    followUpType,
    content,
    result,
    nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : undefined,
    attachments,
    createdBy: user.id,
  });

  res.status(201).json({
    success: true,
    message: '创建跟进记录成功',
    data: followUp
  });
}));

// 更新跟进记录
router.put('/:id', [
  param('id').isInt().withMessage('跟进记录ID必须是整数'),
  body('followUpType').optional().isIn(['phone', 'email', 'wechat', 'meeting', 'visit', 'other']).withMessage('跟进类型参数无效'),
  body('content').optional().notEmpty().withMessage('跟进内容不能为空'),
  body('result').optional().isIn(['no_answer', 'interested', 'not_interested', 'need_more_info', 'quoted', 'negotiating', 'closed']).withMessage('跟进结果参数无效'),
  body('nextFollowUpDate').optional().isISO8601().withMessage('下次跟进日期格式无效'),
  body('attachments').optional().isArray().withMessage('附件必须是数组'),
], validateRequest, asyncHandler(async (req, res) => {
  const followUpId = parseInt(req.params.id);
  const user = req.user!;

  const followUp = await FollowUpService.updateFollowUp(followUpId, {
    ...req.body,
    nextFollowUpDate: req.body.nextFollowUpDate ? new Date(req.body.nextFollowUpDate) : undefined,
  }, user.id);

  res.json({
    success: true,
    message: '更新跟进记录成功',
    data: followUp
  });
}));

// 删除跟进记录
router.delete('/:id', [
  param('id').isInt().withMessage('跟进记录ID必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const followUpId = parseInt(req.params.id);
  const user = req.user!;

  await FollowUpService.deleteFollowUp(followUpId, user.id);

  res.json({
    success: true,
    message: '删除跟进记录成功',
    data: null
  });
}));

// 获取询盘的跟进记录
router.get('/inquiry/:inquiryId', [
  param('inquiryId').isInt().withMessage('询盘ID必须是整数'),
], validateRequest, asyncHandler(async (req, res) => {
  const inquiryId = parseInt(req.params.inquiryId);
  const followUps = await FollowUpService.getInquiryFollowUps(inquiryId);

  res.json({
    success: true,
    message: '获取询盘跟进记录成功',
    data: followUps
  });
}));

// 获取待跟进的记录
router.get('/pending/list', asyncHandler(async (req, res) => {
  const user = req.user!;
  
  // 根据用户角色决定查看范围
  let userId: number | undefined;
  let departmentId: number | undefined;

  switch (user.role) {
    case 'admin':
      // 管理员可以看到所有待跟进记录
      break;
    case 'manager':
      // 经理可以看到本部门的待跟进记录
      departmentId = user.departmentId;
      break;
    default:
      // 其他角色只能看到自己的待跟进记录
      userId = user.id;
      break;
  }

  const pendingFollowUps = await FollowUpService.getPendingFollowUps(userId, departmentId);

  res.json({
    success: true,
    message: '获取待跟进记录成功',
    data: pendingFollowUps
  });
}));

// 获取跟进统计
router.get('/statistics/summary', [
  query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const user = req.user!;

  // 根据用户角色决定统计范围
  let userId: number | undefined;
  let departmentId: number | undefined;

  switch (user.role) {
    case 'admin':
      // 管理员可以看到所有统计
      break;
    case 'manager':
      // 经理可以看到本部门的统计
      departmentId = user.departmentId;
      break;
    default:
      // 其他角色只能看到自己的统计
      userId = user.id;
      break;
  }

  const statistics = await FollowUpService.getFollowUpStatistics(
    userId,
    departmentId,
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined
  );

  res.json({
    success: true,
    message: '获取跟进统计成功',
    data: statistics
  });
}));

export default router;
