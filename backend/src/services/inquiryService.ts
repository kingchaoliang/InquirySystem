import { Inquiry, InquiryStatus, Priority, CustomerType, Prisma } from '@prisma/client';
import prisma from '@/utils/database';
import { CryptoUtils } from '@/utils/crypto';
import { AppError } from '@/middleware/errorHandler';
import { logInfo } from '@/utils/logger';

export interface InquiryListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: InquiryStatus;
  priority?: Priority;
  assignedTo?: number;
  departmentId?: number;
  sourceChannel?: string;
  customerType?: CustomerType;
  startDate?: string;
  endDate?: string;
  userId?: number;
  userRole?: string;
  userDepartmentId?: number;
}

export interface CreateInquiryData {
  title: string;
  content: string;
  sourceChannel: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCompany?: string;
  customerAddress?: string;
  customerType?: CustomerType;
  region?: string;
  country?: string;
  assignedTo?: number;
  departmentId?: number;
  priority?: Priority;
  estimatedValue?: number;
  currency?: string;
  expectedCloseDate?: Date;
  tags?: string[];
  customFields?: Record<string, any>;
  createdBy: number;
}

export interface UpdateInquiryData {
  title?: string;
  content?: string;
  sourceChannel?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  customerCompany?: string;
  customerAddress?: string;
  customerType?: CustomerType;
  region?: string;
  country?: string;
  assignedTo?: number;
  departmentId?: number;
  priority?: Priority;
  status?: InquiryStatus;
  estimatedValue?: number;
  currency?: string;
  expectedCloseDate?: Date;
  tags?: string[];
  customFields?: Record<string, any>;
}

export interface InquiryWithRelations extends Inquiry {
  assignee?: {
    id: number;
    fullName: string;
    email: string;
  } | null;
  department?: {
    id: number;
    name: string;
  } | null;
  creator?: {
    id: number;
    fullName: string;
    email: string;
  };
  followUpRecords?: any[];
  aiAnalysisRecords?: any[];
}

export interface InquiryListResult {
  inquiries: InquiryWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

export class InquiryService {
  /**
   * 获取询盘列表
   */
  static async getInquiryList(params: InquiryListParams): Promise<InquiryListResult> {
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
      userId,
      userRole,
      userDepartmentId,
    } = params;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 构建查询条件
    const where: Prisma.InquiryWhereInput = {};

    // 搜索条件
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
        { customerName: { contains: search } },
        { customerEmail: { contains: search } },
        { customerCompany: { contains: search } },
        { inquiryNo: { contains: search } },
      ];
    }

    // 筛选条件
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (assignedTo) where.assignedTo = assignedTo;
    if (departmentId) where.departmentId = departmentId;
    if (sourceChannel) where.sourceChannel = sourceChannel;
    if (customerType) where.customerType = customerType;

    // 时间范围
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // 数据权限控制
    if (userRole && userId) {
      switch (userRole) {
        case 'sales':
          // 销售人员只能看到分配给自己或自己创建的询盘
          where.OR = [
            { assignedTo: userId },
            { createdBy: userId },
          ];
          break;
        case 'manager':
          // 经理可以看到本部门的询盘
          if (userDepartmentId) {
            where.departmentId = userDepartmentId;
          }
          break;
        case 'admin':
          // 管理员可以看到所有询盘
          break;
        default:
          // 其他角色只能看到分配给自己的询盘
          where.assignedTo = userId;
          break;
      }
    }

    // 查询询盘列表
    const [inquiries, total] = await Promise.all([
      prisma.inquiry.findMany({
        where,
        skip,
        take,
        include: {
          assignee: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          department: {
            select: {
              id: true,
              name: true,
            },
          },
          creator: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          followUpRecords: {
            select: {
              id: true,
              followUpType: true,
              result: true,
              nextFollowUpDate: true,
              createdAt: true,
            },
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.inquiry.count({ where }),
    ]);

    return {
      inquiries,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 根据ID获取询盘详情
   */
  static async getInquiryById(id: number, userId?: number, userRole?: string): Promise<InquiryWithRelations | null> {
    const inquiry = await prisma.inquiry.findUnique({
      where: { id },
      include: {
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        followUpRecords: {
          include: {
            creator: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        aiAnalysisRecords: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!inquiry) {
      return null;
    }

    // 数据权限检查
    if (userId && userRole) {
      const hasAccess = await this.checkInquiryAccess(inquiry, userId, userRole);
      if (!hasAccess) {
        throw new AppError('无权访问此询盘', 403);
      }
    }

    return inquiry;
  }

  /**
   * 创建询盘
   */
  static async createInquiry(inquiryData: CreateInquiryData): Promise<InquiryWithRelations> {
    const {
      title,
      content,
      sourceChannel,
      customerName,
      customerEmail,
      customerPhone,
      customerCompany,
      customerAddress,
      customerType = 'individual',
      region,
      country,
      assignedTo,
      departmentId,
      priority = 'medium',
      estimatedValue,
      currency = 'USD',
      expectedCloseDate,
      tags,
      customFields,
      createdBy,
    } = inquiryData;

    // 生成询盘编号
    const inquiryNo = CryptoUtils.generateInquiryNo();

    // 验证分配人员是否存在
    if (assignedTo) {
      const assignee = await prisma.user.findUnique({
        where: { id: assignedTo },
      });

      if (!assignee) {
        throw new AppError('指定的分配人员不存在', 400);
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

    // 创建询盘
    const inquiry = await prisma.inquiry.create({
      data: {
        inquiryNo,
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
        createdBy,
      },
      include: {
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    logInfo(`Inquiry created: ${inquiry.inquiryNo}`, { inquiryId: inquiry.id, createdBy });

    return inquiry;
  }

  /**
   * 更新询盘
   */
  static async updateInquiry(
    id: number,
    inquiryData: UpdateInquiryData,
    userId?: number,
    userRole?: string
  ): Promise<InquiryWithRelations> {
    // 检查询盘是否存在
    const existingInquiry = await prisma.inquiry.findUnique({
      where: { id },
    });

    if (!existingInquiry) {
      throw new AppError('询盘不存在', 404);
    }

    // 数据权限检查
    if (userId && userRole) {
      const hasAccess = await this.checkInquiryAccess(existingInquiry, userId, userRole);
      if (!hasAccess) {
        throw new AppError('无权修改此询盘', 403);
      }
    }

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
      status,
      estimatedValue,
      currency,
      expectedCloseDate,
      tags,
      customFields,
    } = inquiryData;

    // 验证分配人员是否存在
    if (assignedTo) {
      const assignee = await prisma.user.findUnique({
        where: { id: assignedTo },
      });

      if (!assignee) {
        throw new AppError('指定的分配人员不存在', 400);
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

    // 更新询盘
    const inquiry = await prisma.inquiry.update({
      where: { id },
      data: {
        ...(title && { title }),
        ...(content && { content }),
        ...(sourceChannel && { sourceChannel }),
        ...(customerName && { customerName }),
        ...(customerEmail !== undefined && { customerEmail }),
        ...(customerPhone !== undefined && { customerPhone }),
        ...(customerCompany !== undefined && { customerCompany }),
        ...(customerAddress !== undefined && { customerAddress }),
        ...(customerType && { customerType }),
        ...(region !== undefined && { region }),
        ...(country !== undefined && { country }),
        ...(assignedTo !== undefined && { assignedTo }),
        ...(departmentId !== undefined && { departmentId }),
        ...(priority && { priority }),
        ...(status && { status }),
        ...(estimatedValue !== undefined && { estimatedValue }),
        ...(currency && { currency }),
        ...(expectedCloseDate !== undefined && { expectedCloseDate }),
        ...(tags && { tags }),
        ...(customFields && { customFields }),
      },
      include: {
        assignee: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        department: {
          select: {
            id: true,
            name: true,
          },
        },
        creator: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
    });

    logInfo(`Inquiry updated: ${inquiry.inquiryNo}`, { inquiryId: inquiry.id, updatedBy: userId });

    return inquiry;
  }

  /**
   * 删除询盘
   */
  static async deleteInquiry(id: number, userId?: number, userRole?: string): Promise<void> {
    // 检查询盘是否存在
    const inquiry = await prisma.inquiry.findUnique({
      where: { id },
    });

    if (!inquiry) {
      throw new AppError('询盘不存在', 404);
    }

    // 数据权限检查
    if (userId && userRole) {
      const hasAccess = await this.checkInquiryAccess(inquiry, userId, userRole);
      if (!hasAccess) {
        throw new AppError('无权删除此询盘', 403);
      }
    }

    // 删除询盘（级联删除相关记录）
    await prisma.inquiry.delete({
      where: { id },
    });

    logInfo(`Inquiry deleted: ${inquiry.inquiryNo}`, { inquiryId: inquiry.id, deletedBy: userId });
  }

  /**
   * 批量更新询盘
   */
  static async batchUpdateInquiries(
    ids: number[],
    action: string,
    data: any,
    userId?: number,
    userRole?: string
  ): Promise<void> {
    // 检查所有询盘是否存在且有权限
    const inquiries = await prisma.inquiry.findMany({
      where: { id: { in: ids } },
    });

    if (inquiries.length !== ids.length) {
      throw new AppError('部分询盘不存在', 400);
    }

    // 权限检查
    if (userId && userRole) {
      for (const inquiry of inquiries) {
        const hasAccess = await this.checkInquiryAccess(inquiry, userId, userRole);
        if (!hasAccess) {
          throw new AppError(`无权操作询盘: ${inquiry.inquiryNo}`, 403);
        }
      }
    }

    // 执行批量操作
    switch (action) {
      case 'assign':
        await prisma.inquiry.updateMany({
          where: { id: { in: ids } },
          data: { assignedTo: data.assignedTo },
        });
        break;
      case 'updateStatus':
        await prisma.inquiry.updateMany({
          where: { id: { in: ids } },
          data: { status: data.status },
        });
        break;
      case 'delete':
        await prisma.inquiry.deleteMany({
          where: { id: { in: ids } },
        });
        break;
      default:
        throw new AppError('不支持的批量操作', 400);
    }

    logInfo(`Batch ${action} inquiries`, { inquiryIds: ids, operatedBy: userId });
  }

  /**
   * 检查询盘访问权限
   */
  private static async checkInquiryAccess(
    inquiry: Inquiry,
    userId: number,
    userRole: string
  ): Promise<boolean> {
    switch (userRole) {
      case 'admin':
        return true;
      case 'manager':
        // 经理可以访问本部门的询盘
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { departmentId: true },
        });
        return inquiry.departmentId === user?.departmentId;
      case 'sales':
        // 销售人员只能访问分配给自己或自己创建的询盘
        return inquiry.assignedTo === userId || inquiry.createdBy === userId;
      default:
        return inquiry.assignedTo === userId;
    }
  }
}
