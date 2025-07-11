import express from 'express';
import { body, validationResult } from 'express-validator';
import { asyncHandler, AppError } from '@/middleware/errorHandler';
import { AuthService } from '@/services/authService';
import { authMiddleware } from '@/middleware/auth';
import { logInfo } from '@/utils/logger';

const router = express.Router();

// 登录验证规则
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少6位'),
];

// 注册验证规则
const registerValidation = [
  body('username')
    .isLength({ min: 3, max: 50 })
    .withMessage('用户名长度3-50位')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('用户名只能包含字母、数字和下划线'),
  body('email')
    .isEmail()
    .withMessage('请输入有效的邮箱地址')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('密码至少6位')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('密码必须包含大小写字母和数字'),
  body('fullName')
    .isLength({ min: 2, max: 100 })
    .withMessage('真实姓名长度2-100位')
    .trim(),
  body('phone')
    .optional()
    .isMobilePhone('zh-CN')
    .withMessage('请输入有效的手机号码'),
  body('departmentId')
    .optional()
    .isInt({ min: 1 })
    .withMessage('部门ID必须是正整数'),
];

// 修改密码验证规则
const changePasswordValidation = [
  body('oldPassword')
    .notEmpty()
    .withMessage('请输入原密码'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('新密码至少6位')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('新密码必须包含大小写字母和数字'),
];

// 验证请求参数的中间件
const validateRequest = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(`参数验证失败: ${errors.array().map(err => err.msg).join(', ')}`, 400);
  }
  next();
};

// 用户登录
router.post('/login', loginValidation, validateRequest, asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  logInfo(`Login attempt for email: ${email}`, { ip: req.ip });

  const result = await AuthService.login({ email, password });

  res.json({
    success: true,
    message: '登录成功',
    data: result
  });
}));

// 用户注册
router.post('/register', registerValidation, validateRequest, asyncHandler(async (req, res) => {
  const { username, email, password, fullName, phone, departmentId } = req.body;

  logInfo(`Registration attempt for email: ${email}`, { ip: req.ip });

  const result = await AuthService.register({
    username,
    email,
    password,
    fullName,
    phone,
    departmentId,
  });

  res.status(201).json({
    success: true,
    message: '注册成功',
    data: result
  });
}));

// 用户登出
router.post('/logout', authMiddleware, asyncHandler(async (req, res) => {
  logInfo(`User logged out: ${req.user!.email}`, { userId: req.user!.id });

  res.json({
    success: true,
    message: '登出成功',
    data: null
  });
}));

// 刷新token
router.post('/refresh', asyncHandler(async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError('未提供访问令牌', 401);
  }

  const token = authHeader.substring(7);
  const result = await AuthService.refreshToken(token);

  res.json({
    success: true,
    message: 'Token刷新成功',
    data: result
  });
}));

// 修改密码
router.put('/change-password', authMiddleware, changePasswordValidation, validateRequest, asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user!.id;

  await AuthService.changePassword(userId, oldPassword, newPassword);

  res.json({
    success: true,
    message: '密码修改成功',
    data: null
  });
}));

// 获取当前用户信息
router.get('/me', authMiddleware, asyncHandler(async (req, res) => {
  res.json({
    success: true,
    message: '获取用户信息成功',
    data: req.user
  });
}));

export default router;
