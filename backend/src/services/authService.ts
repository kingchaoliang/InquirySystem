import { User, UserRole, UserStatus } from '@prisma/client';
import prisma from '@/utils/database';
import { CryptoUtils } from '@/utils/crypto';
import { AppError } from '@/middleware/errorHandler';
import { logInfo, logError } from '@/utils/logger';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role?: UserRole;
  departmentId?: number;
}

export interface AuthResult {
  user: Omit<User, 'passwordHash'>;
  token: string;
}

export class AuthService {
  /**
   * 用户登录
   */
  static async login(credentials: LoginCredentials): Promise<AuthResult> {
    const { email, password } = credentials;

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!user) {
      throw new AppError('邮箱或密码错误', 401);
    }

    // 检查用户状态
    if (user.status !== UserStatus.active) {
      throw new AppError('账户已被禁用，请联系管理员', 401);
    }

    // 验证密码
    const isPasswordValid = await CryptoUtils.verifyPassword(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('邮箱或密码错误', 401);
    }

    // 更新最后登录时间
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // 生成JWT token
    const token = CryptoUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // 移除密码哈希
    const { passwordHash, ...userWithoutPassword } = user;

    logInfo(`User logged in: ${user.email}`, { userId: user.id });

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * 用户注册
   */
  static async register(registerData: RegisterData): Promise<AuthResult> {
    const { username, email, password, fullName, phone, role = UserRole.sales, departmentId } = registerData;

    // 检查用户名是否已存在
    const existingUsername = await prisma.user.findUnique({
      where: { username },
    });

    if (existingUsername) {
      throw new AppError('用户名已存在', 409);
    }

    // 检查邮箱是否已存在
    const existingEmail = await prisma.user.findUnique({
      where: { email },
    });

    if (existingEmail) {
      throw new AppError('邮箱已被注册', 409);
    }

    // 验证部门是否存在
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });

      if (!department) {
        throw new AppError('指定的部门不存在', 400);
      }
    }

    // 加密密码
    const passwordHash = await CryptoUtils.hashPassword(password);

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
        fullName,
        phone,
        role,
        departmentId,
        status: UserStatus.active,
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // 生成JWT token
    const token = CryptoUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    // 移除密码哈希
    const { passwordHash: _, ...userWithoutPassword } = user;

    logInfo(`User registered: ${user.email}`, { userId: user.id });

    return {
      user: userWithoutPassword,
      token,
    };
  }

  /**
   * 验证token并获取用户信息
   */
  static async verifyTokenAndGetUser(token: string): Promise<Omit<User, 'passwordHash'>> {
    try {
      const decoded = CryptoUtils.verifyToken(token);
      
      const user = await prisma.user.findUnique({
        where: { id: decoded.userId },
        include: {
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!user) {
        throw new AppError('用户不存在', 401);
      }

      if (user.status !== UserStatus.active) {
        throw new AppError('账户已被禁用', 401);
      }

      const { passwordHash, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('无效的访问令牌', 401);
    }
  }

  /**
   * 刷新token
   */
  static async refreshToken(oldToken: string): Promise<{ token: string }> {
    const user = await this.verifyTokenAndGetUser(oldToken);
    
    const newToken = CryptoUtils.generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });

    return { token: newToken };
  }

  /**
   * 修改密码
   */
  static async changePassword(
    userId: number,
    oldPassword: string,
    newPassword: string
  ): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    // 验证旧密码
    const isOldPasswordValid = await CryptoUtils.verifyPassword(oldPassword, user.passwordHash);
    if (!isOldPasswordValid) {
      throw new AppError('原密码错误', 400);
    }

    // 加密新密码
    const newPasswordHash = await CryptoUtils.hashPassword(newPassword);

    // 更新密码
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    logInfo(`User changed password: ${user.email}`, { userId: user.id });
  }

  /**
   * 重置密码（管理员功能）
   */
  static async resetPassword(userId: number, newPassword: string): Promise<void> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    // 加密新密码
    const passwordHash = await CryptoUtils.hashPassword(newPassword);

    // 更新密码
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    logInfo(`Admin reset password for user: ${user.email}`, { userId: user.id });
  }
}
