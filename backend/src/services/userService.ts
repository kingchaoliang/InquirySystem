import { User, UserRole, UserStatus, Prisma } from '@prisma/client';
import prisma from '@/utils/database';
import { CryptoUtils } from '@/utils/crypto';
import { AppError } from '@/middleware/errorHandler';
import { logInfo } from '@/utils/logger';

export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  role?: UserRole;
  status?: UserStatus;
  departmentId?: number;
}

export interface CreateUserData {
  username: string;
  email: string;
  password: string;
  fullName: string;
  phone?: string;
  role: UserRole;
  departmentId?: number;
  status?: UserStatus;
}

export interface UpdateUserData {
  username?: string;
  email?: string;
  fullName?: string;
  phone?: string;
  role?: UserRole;
  departmentId?: number;
  status?: UserStatus;
}

export interface UserListResult {
  users: Omit<User, 'passwordHash'>[];
  total: number;
  page: number;
  pageSize: number;
}

export class UserService {
  /**
   * 获取用户列表
   */
  static async getUserList(params: UserListParams): Promise<UserListResult> {
    const {
      page = 1,
      pageSize = 20,
      search,
      role,
      status,
      departmentId,
    } = params;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 构建查询条件
    const where: Prisma.UserWhereInput = {};

    if (search) {
      where.OR = [
        { username: { contains: search } },
        { email: { contains: search } },
        { fullName: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    // 查询用户列表
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take,
        select: {
          id: true,
          username: true,
          email: true,
          fullName: true,
          phone: true,
          role: true,
          departmentId: true,
          status: true,
          lastLoginAt: true,
          createdAt: true,
          updatedAt: true,
          department: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.user.count({ where }),
    ]);

    return {
      users: users as any,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 根据ID获取用户详情
   */
  static async getUserById(id: number): Promise<Omit<User, 'passwordHash'> | null> {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        departmentId: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return user as any;
  }

  /**
   * 创建用户
   */
  static async createUser(userData: CreateUserData): Promise<Omit<User, 'passwordHash'>> {
    const {
      username,
      email,
      password,
      fullName,
      phone,
      role,
      departmentId,
      status = UserStatus.active,
    } = userData;

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
        status,
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        departmentId: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logInfo(`User created: ${user.email}`, { userId: user.id, createdBy: 'admin' });

    return user as any;
  }

  /**
   * 更新用户信息
   */
  static async updateUser(id: number, userData: UpdateUserData): Promise<Omit<User, 'passwordHash'>> {
    const { username, email, fullName, phone, role, departmentId, status } = userData;

    // 检查用户是否存在
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new AppError('用户不存在', 404);
    }

    // 检查用户名是否已被其他用户使用
    if (username && username !== existingUser.username) {
      const existingUsername = await prisma.user.findUnique({
        where: { username },
      });

      if (existingUsername) {
        throw new AppError('用户名已存在', 409);
      }
    }

    // 检查邮箱是否已被其他用户使用
    if (email && email !== existingUser.email) {
      const existingEmail = await prisma.user.findUnique({
        where: { email },
      });

      if (existingEmail) {
        throw new AppError('邮箱已被注册', 409);
      }
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

    // 更新用户
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(username && { username }),
        ...(email && { email }),
        ...(fullName && { fullName }),
        ...(phone !== undefined && { phone }),
        ...(role && { role }),
        ...(departmentId !== undefined && { departmentId }),
        ...(status && { status }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        role: true,
        departmentId: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        department: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    logInfo(`User updated: ${user.email}`, { userId: user.id });

    return user as any;
  }

  /**
   * 删除用户
   */
  static async deleteUser(id: number): Promise<void> {
    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    // 检查用户是否有关联的询盘
    const inquiryCount = await prisma.inquiry.count({
      where: {
        OR: [
          { assignedTo: id },
          { createdBy: id },
        ],
      },
    });

    if (inquiryCount > 0) {
      throw new AppError('该用户有关联的询盘，无法删除', 400);
    }

    // 删除用户
    await prisma.user.delete({
      where: { id },
    });

    logInfo(`User deleted: ${user.email}`, { userId: user.id });
  }

  /**
   * 重置用户密码
   */
  static async resetUserPassword(id: number, newPassword: string): Promise<void> {
    // 检查用户是否存在
    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new AppError('用户不存在', 404);
    }

    // 加密新密码
    const passwordHash = await CryptoUtils.hashPassword(newPassword);

    // 更新密码
    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

    logInfo(`User password reset: ${user.email}`, { userId: user.id });
  }
}
