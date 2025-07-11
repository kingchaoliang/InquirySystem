import { FollowUpRecord, FollowUpType, FollowUpResult, Prisma } from '@prisma/client';
import prisma from '@/utils/database';
import { AppError } from '@/middleware/errorHandler';
import { logInfo } from '@/utils/logger';

export interface FollowUpListParams {
  page?: number;
  pageSize?: number;
  inquiryId?: number;
  followUpType?: FollowUpType;
  result?: FollowUpResult;
  createdBy?: number;
  startDate?: string;
  endDate?: string;
}

export interface CreateFollowUpData {
  inquiryId: number;
  followUpType: FollowUpType;
  content: string;
  result?: FollowUpResult;
  nextFollowUpDate?: Date;
  attachments?: string[];
  createdBy: number;
}

export interface UpdateFollowUpData {
  followUpType?: FollowUpType;
  content?: string;
  result?: FollowUpResult;
  nextFollowUpDate?: Date;
  attachments?: string[];
}

export interface FollowUpWithRelations extends FollowUpRecord {
  inquiry?: {
    id: number;
    title: string;
    inquiryNo: string;
    customerName: string;
  };
  creator?: {
    id: number;
    fullName: string;
    email: string;
  };
}

export interface FollowUpListResult {
  followUps: FollowUpWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

export class FollowUpService {
  /**
   * 获取跟进记录列表
   */
  static async getFollowUpList(params: FollowUpListParams): Promise<FollowUpListResult> {
    const {
      page = 1,
      pageSize = 20,
      inquiryId,
      followUpType,
      result,
      createdBy,
      startDate,
      endDate,
    } = params;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 构建查询条件
    const where: Prisma.FollowUpRecordWhereInput = {};

    if (inquiryId) {
      where.inquiryId = inquiryId;
    }

    if (followUpType) {
      where.followUpType = followUpType;
    }

    if (result) {
      where.result = result;
    }

    if (createdBy) {
      where.createdBy = createdBy;
    }

    // 时间范围
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }

    // 查询跟进记录列表
    const [followUps, total] = await Promise.all([
      prisma.followUpRecord.findMany({
        where,
        skip,
        take,
        include: {
          inquiry: {
            select: {
              id: true,
              title: true,
              inquiryNo: true,
              customerName: true,
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
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.followUpRecord.count({ where }),
    ]);

    return {
      followUps,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 根据ID获取跟进记录详情
   */
  static async getFollowUpById(id: number): Promise<FollowUpWithRelations | null> {
    return prisma.followUpRecord.findUnique({
      where: { id },
      include: {
        inquiry: {
          select: {
            id: true,
            title: true,
            inquiryNo: true,
            customerName: true,
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
  }

  /**
   * 创建跟进记录
   */
  static async createFollowUp(followUpData: CreateFollowUpData): Promise<FollowUpWithRelations> {
    const {
      inquiryId,
      followUpType,
      content,
      result,
      nextFollowUpDate,
      attachments,
      createdBy,
    } = followUpData;

    // 验证询盘是否存在
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
    });

    if (!inquiry) {
      throw new AppError('询盘不存在', 404);
    }

    // 创建跟进记录
    const followUp = await prisma.followUpRecord.create({
      data: {
        inquiryId,
        followUpType,
        content,
        result,
        nextFollowUpDate,
        attachments,
        createdBy,
      },
      include: {
        inquiry: {
          select: {
            id: true,
            title: true,
            inquiryNo: true,
            customerName: true,
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

    // 如果有跟进结果，可能需要更新询盘状态
    if (result) {
      await this.updateInquiryStatusBasedOnFollowUp(inquiryId, result);
    }

    logInfo(`Follow-up record created`, {
      followUpId: followUp.id,
      inquiryId,
      followUpType,
      result,
      createdBy,
    });

    return followUp;
  }

  /**
   * 更新跟进记录
   */
  static async updateFollowUp(
    id: number,
    followUpData: UpdateFollowUpData,
    userId?: number
  ): Promise<FollowUpWithRelations> {
    const {
      followUpType,
      content,
      result,
      nextFollowUpDate,
      attachments,
    } = followUpData;

    // 检查跟进记录是否存在
    const existingFollowUp = await prisma.followUpRecord.findUnique({
      where: { id },
    });

    if (!existingFollowUp) {
      throw new AppError('跟进记录不存在', 404);
    }

    // 权限检查：只有创建者可以修改
    if (userId && existingFollowUp.createdBy !== userId) {
      throw new AppError('无权修改此跟进记录', 403);
    }

    // 更新跟进记录
    const followUp = await prisma.followUpRecord.update({
      where: { id },
      data: {
        ...(followUpType && { followUpType }),
        ...(content && { content }),
        ...(result !== undefined && { result }),
        ...(nextFollowUpDate !== undefined && { nextFollowUpDate }),
        ...(attachments && { attachments }),
      },
      include: {
        inquiry: {
          select: {
            id: true,
            title: true,
            inquiryNo: true,
            customerName: true,
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

    // 如果更新了跟进结果，可能需要更新询盘状态
    if (result) {
      await this.updateInquiryStatusBasedOnFollowUp(existingFollowUp.inquiryId, result);
    }

    logInfo(`Follow-up record updated`, {
      followUpId: followUp.id,
      inquiryId: existingFollowUp.inquiryId,
      updatedBy: userId,
    });

    return followUp;
  }

  /**
   * 删除跟进记录
   */
  static async deleteFollowUp(id: number, userId?: number): Promise<void> {
    // 检查跟进记录是否存在
    const followUp = await prisma.followUpRecord.findUnique({
      where: { id },
    });

    if (!followUp) {
      throw new AppError('跟进记录不存在', 404);
    }

    // 权限检查：只有创建者可以删除
    if (userId && followUp.createdBy !== userId) {
      throw new AppError('无权删除此跟进记录', 403);
    }

    // 删除跟进记录
    await prisma.followUpRecord.delete({
      where: { id },
    });

    logInfo(`Follow-up record deleted`, {
      followUpId: followUp.id,
      inquiryId: followUp.inquiryId,
      deletedBy: userId,
    });
  }

  /**
   * 获取询盘的跟进记录
   */
  static async getInquiryFollowUps(inquiryId: number): Promise<FollowUpWithRelations[]> {
    return prisma.followUpRecord.findMany({
      where: { inquiryId },
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
    });
  }

  /**
   * 获取待跟进的记录
   */
  static async getPendingFollowUps(
    userId?: number,
    departmentId?: number
  ): Promise<FollowUpWithRelations[]> {
    const where: Prisma.FollowUpRecordWhereInput = {
      nextFollowUpDate: {
        lte: new Date(),
      },
      result: {
        not: 'closed',
      },
    };

    // 根据用户权限过滤
    if (userId) {
      where.createdBy = userId;
    } else if (departmentId) {
      where.inquiry = {
        departmentId,
      };
    }

    return prisma.followUpRecord.findMany({
      where,
      include: {
        inquiry: {
          select: {
            id: true,
            title: true,
            inquiryNo: true,
            customerName: true,
            status: true,
            priority: true,
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
      orderBy: {
        nextFollowUpDate: 'asc',
      },
    });
  }

  /**
   * 获取跟进统计
   */
  static async getFollowUpStatistics(
    userId?: number,
    departmentId?: number,
    startDate?: Date,
    endDate?: Date
  ): Promise<{
    totalFollowUps: number;
    followUpsByType: any[];
    followUpsByResult: any[];
    averageResponseTime: number;
    pendingFollowUps: number;
  }> {
    const where: Prisma.FollowUpRecordWhereInput = {};

    // 时间范围
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    // 权限过滤
    if (userId) {
      where.createdBy = userId;
    } else if (departmentId) {
      where.inquiry = {
        departmentId,
      };
    }

    const [
      totalFollowUps,
      followUpsByType,
      followUpsByResult,
      pendingFollowUps,
    ] = await Promise.all([
      prisma.followUpRecord.count({ where }),
      prisma.followUpRecord.groupBy({
        by: ['followUpType'],
        where,
        _count: true,
      }),
      prisma.followUpRecord.groupBy({
        by: ['result'],
        where,
        _count: true,
      }),
      prisma.followUpRecord.count({
        where: {
          ...where,
          nextFollowUpDate: {
            lte: new Date(),
          },
          result: {
            not: 'closed',
          },
        },
      }),
    ]);

    return {
      totalFollowUps,
      followUpsByType,
      followUpsByResult,
      averageResponseTime: 0, // TODO: 计算平均响应时间
      pendingFollowUps,
    };
  }

  /**
   * 根据跟进结果更新询盘状态
   */
  private static async updateInquiryStatusBasedOnFollowUp(
    inquiryId: number,
    followUpResult: FollowUpResult
  ): Promise<void> {
    let newStatus: string | undefined;

    switch (followUpResult) {
      case 'interested':
        newStatus = 'contacted';
        break;
      case 'quoted':
        newStatus = 'quoted';
        break;
      case 'negotiating':
        newStatus = 'negotiating';
        break;
      case 'closed':
        newStatus = 'won';
        break;
      case 'not_interested':
        newStatus = 'lost';
        break;
      default:
        // 其他结果不自动更新状态
        break;
    }

    if (newStatus) {
      await prisma.inquiry.update({
        where: { id: inquiryId },
        data: { status: newStatus as any },
      });

      logInfo(`Inquiry status updated based on follow-up result`, {
        inquiryId,
        followUpResult,
        newStatus,
      });
    }
  }
}
