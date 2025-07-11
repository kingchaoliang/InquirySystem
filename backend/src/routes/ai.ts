import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { asyncHandler, AppError } from '@/middleware/errorHandler';
import { AiService } from '@/services/aiService';

const router = express.Router();

// 验证请求参数的中间件
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(`参数验证失败: ${errors.array().map(err => err.msg).join(', ')}`, 400);
  }
  next();
};

// 执行AI分析
router.post('/analyze', [
  body('inquiryId').isInt().withMessage('inquiryId必须是整数'),
  body('analysisType').isIn(['content_analysis', 'intent_analysis', 'sentiment_analysis', 'recommendation']).withMessage('分析类型参数无效'),
  body('aiProvider').optional().isIn(['openai', 'deepseek', 'gemini']).withMessage('AI提供商参数无效'),
  body('modelName').optional().isString().withMessage('模型名称必须是字符串'),
], validateRequest, asyncHandler(async (req, res) => {
  const { inquiryId, analysisType, aiProvider, modelName } = req.body;
  const user = req.user!;

  const result = await AiService.performAnalysis({
    inquiryId,
    analysisType,
    aiProvider,
    modelName,
    createdBy: user.id,
  });

  res.json({
    success: true,
    message: 'AI分析完成',
    data: result
  });
}));

// 获取AI分析历史
router.get('/history/:inquiryId', [
  param('inquiryId').isInt().withMessage('询盘ID必须是整数'),
  query('analysisType').optional().isIn(['content_analysis', 'intent_analysis', 'sentiment_analysis', 'recommendation']).withMessage('分析类型参数无效'),
  query('aiProvider').optional().isIn(['openai', 'deepseek', 'gemini']).withMessage('AI提供商参数无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const inquiryId = parseInt(req.params.inquiryId);
  const { analysisType, aiProvider } = req.query;

  const history = await AiService.getAnalysisHistory(
    inquiryId,
    analysisType as any,
    aiProvider as any
  );

  res.json({
    success: true,
    message: '获取AI分析历史成功',
    data: history
  });
}));

// 批量AI分析
router.post('/batch-analyze', [
  body('inquiryIds').isArray().withMessage('inquiryIds必须是数组'),
  body('inquiryIds.*').isInt().withMessage('inquiryId必须是整数'),
  body('analysisType').isIn(['content_analysis', 'intent_analysis', 'sentiment_analysis', 'recommendation']).withMessage('分析类型参数无效'),
  body('aiProvider').optional().isIn(['openai', 'deepseek', 'gemini']).withMessage('AI提供商参数无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const { inquiryIds, analysisType, aiProvider } = req.body;
  const user = req.user!;

  // 异步执行批量分析
  AiService.batchAnalysis(inquiryIds, analysisType, aiProvider, user.id);

  res.json({
    success: true,
    message: '批量AI分析已启动',
    data: { count: inquiryIds.length }
  });
}));

// 获取AI分析统计
router.get('/statistics', [
  query('startDate').optional().isISO8601().withMessage('开始日期格式无效'),
  query('endDate').optional().isISO8601().withMessage('结束日期格式无效'),
  query('aiProvider').optional().isIn(['openai', 'deepseek', 'gemini']).withMessage('AI提供商参数无效'),
], validateRequest, asyncHandler(async (req, res) => {
  const { startDate, endDate, aiProvider } = req.query;

  const statistics = await AiService.getAnalysisStatistics(
    startDate ? new Date(startDate as string) : undefined,
    endDate ? new Date(endDate as string) : undefined,
    aiProvider as any
  );

  res.json({
    success: true,
    message: '获取AI分析统计成功',
    data: statistics
  });
}));

// 获取AI配置
router.get('/config', asyncHandler(async (req, res) => {
  // TODO: 实现获取AI配置逻辑
  res.json({
    success: true,
    message: '获取AI配置接口待实现',
    data: {
      providers: [],
      models: [],
      defaultProvider: null,
      defaultModel: null
    }
  });
}));

// 更新AI配置（管理员权限）
router.put('/config', [
  body('defaultProvider').optional().isIn(['openai', 'deepseek', 'gemini']),
  body('defaultModel').optional().isString(),
  body('apiKeys').optional().isObject(),
], asyncHandler(async (req, res) => {
  // TODO: 实现更新AI配置逻辑
  res.json({
    success: true,
    message: '更新AI配置接口待实现',
    data: null
  });
}));

// 测试AI连接
router.post('/test-connection', [
  body('aiProvider').isIn(['openai', 'deepseek', 'gemini']),
  body('apiKey').optional().isString(),
], asyncHandler(async (req, res) => {
  // TODO: 实现测试AI连接逻辑
  res.json({
    success: true,
    message: '测试AI连接接口待实现',
    data: {
      connected: false,
      latency: 0,
      error: null
    }
  });
}));

// 测试AI连接
router.post('/test-connection', [
  body('aiProvider').isIn(['openai', 'deepseek', 'gemini']).withMessage('AI提供商参数无效'),
  body('apiKey').optional().isString().withMessage('API密钥必须是字符串'),
], validateRequest, asyncHandler(async (req, res) => {
  const { aiProvider, apiKey } = req.body;

  const result = await AiService.testConnection(aiProvider, apiKey);

  res.json({
    success: true,
    message: '测试AI连接完成',
    data: result
  });
}));

export default router;
