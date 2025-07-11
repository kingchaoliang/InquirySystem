import { Prisma } from '@prisma/client';
import prisma from '@/utils/database';
import { AppError } from '@/middleware/errorHandler';
import { logInfo } from '@/utils/logger';

export interface StatisticsParams {
  startDate?: Date;
  endDate?: Date;
  departmentId?: number;
  userId?: number;
  userRole?: string;
}

export interface InquiryStatistics {
  totalInquiries: number;
  newInquiries: number;
  closedInquiries: number;
  conversionRate: number;
  averageValue: number;
  totalValue: number;
  inquiriesByStatus: any[];
  inquiriesByPriority: any[];
  inquiriesBySource: any[];
  inquiriesByDepartment: any[];
  inquiriesByAssignee: any[];
  dailyTrend: any[];
  monthlyTrend: any[];
}

export interface UserPerformance {
  userId: number;
  userName: string;
  totalInquiries: number;
  closedInquiries: number;
  conversionRate: number;
  totalValue: number;
  averageResponseTime: number;
  followUpCount: number;
}

export interface DepartmentPerformance {
  departmentId: number;
  departmentName: string;
  totalInquiries: number;
  closedInquiries: number;
  conversionRate: number;
  totalValue: number;
  userCount: number;
  averageInquiriesPerUser: number;
}

export interface DashboardData {
  overview: {
    totalInquiries: number;
    newInquiries: number;
    pendingInquiries: number;
    closedInquiries: number;
    conversionRate: number;
    totalValue: number;
  };
  recentInquiries: any[];
  pendingFollowUps: any[];
  topPerformers: UserPerformance[];
  inquiryTrend: any[];
  statusDistribution: any[];
}

export class StatisticsService {
  /**
   * 获取询盘统计数据
   */
  static async getInquiryStatistics(params: StatisticsParams): Promise<InquiryStatistics> {
    const { startDate, endDate, departmentId, userId, userRole } = params;

    // 构建基础查询条件
    const where = this.buildWhereCondition(startDate, endDate, departmentId, userId, userRole);

    // 并行查询各种统计数据
    const [
      totalInquiries,
      newInquiries,
      closedInquiries,
      averageValue,
      totalValue,
      inquiriesByStatus,
      inquiriesByPriority,
      inquiriesBySource,
      inquiriesByDepartment,
      inquiriesByAssignee,
      dailyTrend,
      monthlyTrend,
    ] = await Promise.all([
      // 总询盘数
      prisma.inquiry.count({ where }),
      
      // 新询盘数（本期新增）
      prisma.inquiry.count({
        where: {
          ...where,
          status: 'new',
        },
      }),
      
      // 已关闭询盘数
      prisma.inquiry.count({
        where: {
          ...where,
          status: { in: ['won', 'lost', 'closed'] },
        },
      }),
      
      // 平均价值
      prisma.inquiry.aggregate({
        where,
        _avg: { estimatedValue: true },
      }),
      
      // 总价值
      prisma.inquiry.aggregate({
        where,
        _sum: { estimatedValue: true },
      }),
      
      // 按状态分组
      prisma.inquiry.groupBy({
        by: ['status'],
        where,
        _count: true,
        _sum: { estimatedValue: true },
      }),
      
      // 按优先级分组
      prisma.inquiry.groupBy({
        by: ['priority'],
        where,
        _count: true,
      }),
      
      // 按来源渠道分组
      prisma.inquiry.groupBy({
        by: ['sourceChannel'],
        where,
        _count: true,
      }),
      
      // 按部门分组
      prisma.inquiry.groupBy({
        by: ['departmentId'],
        where: {
          ...where,
          departmentId: { not: null },
        },
        _count: true,
        _sum: { estimatedValue: true },
      }),
      
      // 按分配人分组
      prisma.inquiry.groupBy({
        by: ['assignedTo'],
        where: {
          ...where,
          assignedTo: { not: null },
        },
        _count: true,
        _sum: { estimatedValue: true },
      }),
      
      // 每日趋势
      this.getDailyTrend(where, startDate, endDate),
      
      // 每月趋势
      this.getMonthlyTrend(where, startDate, endDate),
    ]);

    const conversionRate = totalInquiries > 0 ? (closedInquiries / totalInquiries) * 100 : 0;

    return {
      totalInquiries,
      newInquiries,
      closedInquiries,
      conversionRate,
      averageValue: averageValue._avg.estimatedValue || 0,
      totalValue: totalValue._sum.estimatedValue || 0,
      inquiriesByStatus,
      inquiriesByPriority,
      inquiriesBySource,
      inquiriesByDepartment,
      inquiriesByAssignee,
      dailyTrend,
      monthlyTrend,
    };
  }

  /**
   * 获取用户绩效统计
   */
  static async getUserPerformance(params: StatisticsParams): Promise<UserPerformance[]> {
    const { startDate, endDate, departmentId, userId } = params;

    const where = this.buildWhereCondition(startDate, endDate, departmentId, userId);

    // 获取用户绩效数据
    const userStats = await prisma.inquiry.groupBy({
      by: ['assignedTo'],
      where: {
        ...where,
        assignedTo: { not: null },
      },
      _count: true,
      _sum: { estimatedValue: true },
    });

    // 获取用户信息和详细统计
    const userPerformance: UserPerformance[] = [];

    for (const stat of userStats) {
      if (!stat.assignedTo) continue;

      const [user, closedCount, followUpCount] = await Promise.all([
        prisma.user.findUnique({
          where: { id: stat.assignedTo },
          select: { id: true, fullName: true },
        }),
        prisma.inquiry.count({
          where: {
            ...where,
            assignedTo: stat.assignedTo,
            status: { in: ['won', 'closed'] },
          },
        }),
        prisma.followUpRecord.count({
          where: {
            createdBy: stat.assignedTo,
            ...(startDate && { createdAt: { gte: startDate } }),
            ...(endDate && { createdAt: { lte: endDate } }),
          },
        }),
      ]);

      if (user) {
        userPerformance.push({
          userId: user.id,
          userName: user.fullName,
          totalInquiries: stat._count,
          closedInquiries: closedCount,
          conversionRate: stat._count > 0 ? (closedCount / stat._count) * 100 : 0,
          totalValue: stat._sum.estimatedValue || 0,
          averageResponseTime: 0, // TODO: 计算平均响应时间
          followUpCount,
        });
      }
    }

    return userPerformance.sort((a, b) => b.totalValue - a.totalValue);
  }

  /**
   * 获取部门绩效统计
   */
  static async getDepartmentPerformance(params: StatisticsParams): Promise<DepartmentPerformance[]> {
    const { startDate, endDate } = params;

    const where = this.buildWhereCondition(startDate, endDate);

    // 获取部门绩效数据
    const deptStats = await prisma.inquiry.groupBy({
      by: ['departmentId'],
      where: {
        ...where,
        departmentId: { not: null },
      },
      _count: true,
      _sum: { estimatedValue: true },
    });

    const departmentPerformance: DepartmentPerformance[] = [];

    for (const stat of deptStats) {
      if (!stat.departmentId) continue;

      const [department, closedCount, userCount] = await Promise.all([
        prisma.department.findUnique({
          where: { id: stat.departmentId },
          select: { id: true, name: true },
        }),
        prisma.inquiry.count({
          where: {
            ...where,
            departmentId: stat.departmentId,
            status: { in: ['won', 'closed'] },
          },
        }),
        prisma.user.count({
          where: { departmentId: stat.departmentId },
        }),
      ]);

      if (department) {
        departmentPerformance.push({
          departmentId: department.id,
          departmentName: department.name,
          totalInquiries: stat._count,
          closedInquiries: closedCount,
          conversionRate: stat._count > 0 ? (closedCount / stat._count) * 100 : 0,
          totalValue: stat._sum.estimatedValue || 0,
          userCount,
          averageInquiriesPerUser: userCount > 0 ? stat._count / userCount : 0,
        });
      }
    }

    return departmentPerformance.sort((a, b) => b.totalValue - a.totalValue);
  }

  /**
   * 获取仪表板数据
   */
  static async getDashboardData(params: StatisticsParams): Promise<DashboardData> {
    const { departmentId, userId, userRole } = params;

    // 获取最近30天的数据
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    const where = this.buildWhereCondition(startDate, endDate, departmentId, userId, userRole);

    const [
      totalInquiries,
      newInquiries,
      pendingInquiries,
      closedInquiries,
      totalValue,
      recentInquiries,
      pendingFollowUps,
      topPerformers,
      inquiryTrend,
      statusDistribution,
    ] = await Promise.all([
      prisma.inquiry.count({ where }),
      prisma.inquiry.count({ where: { ...where, status: 'new' } }),
      prisma.inquiry.count({ where: { ...where, status: { in: ['contacted', 'quoted', 'negotiating'] } } }),
      prisma.inquiry.count({ where: { ...where, status: { in: ['won', 'closed'] } } }),
      prisma.inquiry.aggregate({ where, _sum: { estimatedValue: true } }),
      
      // 最近的询盘
      prisma.inquiry.findMany({
        where,
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          inquiryNo: true,
          customerName: true,
          status: true,
          priority: true,
          estimatedValue: true,
          createdAt: true,
          assignee: {
            select: { fullName: true },
          },
        },
      }),
      
      // 待跟进的记录
      prisma.followUpRecord.findMany({
        where: {
          nextFollowUpDate: { lte: new Date() },
          result: { not: 'closed' },
          ...(userId && { createdBy: userId }),
        },
        take: 10,
        orderBy: { nextFollowUpDate: 'asc' },
        include: {
          inquiry: {
            select: {
              id: true,
              title: true,
              inquiryNo: true,
              customerName: true,
            },
          },
        },
      }),
      
      // 获取绩效前5名
      this.getUserPerformance({ startDate, endDate, departmentId, userId, userRole }),
      
      // 询盘趋势（最近7天）
      this.getDailyTrend(where, new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), endDate),
      
      // 状态分布
      prisma.inquiry.groupBy({
        by: ['status'],
        where,
        _count: true,
      }),
    ]);

    const conversionRate = totalInquiries > 0 ? (closedInquiries / totalInquiries) * 100 : 0;

    return {
      overview: {
        totalInquiries,
        newInquiries,
        pendingInquiries,
        closedInquiries,
        conversionRate,
        totalValue: totalValue._sum.estimatedValue || 0,
      },
      recentInquiries,
      pendingFollowUps,
      topPerformers: topPerformers.slice(0, 5),
      inquiryTrend,
      statusDistribution,
    };
  }

  /**
   * 构建查询条件
   */
  private static buildWhereCondition(
    startDate?: Date,
    endDate?: Date,
    departmentId?: number,
    userId?: number,
    userRole?: string
  ): Prisma.InquiryWhereInput {
    const where: Prisma.InquiryWhereInput = {};

    // 时间范围
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
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
          if (departmentId) {
            where.departmentId = departmentId;
          }
          break;
        case 'admin':
          // 管理员可以看到所有询盘
          if (departmentId) {
            where.departmentId = departmentId;
          }
          break;
        default:
          // 其他角色只能看到分配给自己的询盘
          where.assignedTo = userId;
          break;
      }
    } else if (departmentId) {
      where.departmentId = departmentId;
    }

    return where;
  }

  /**
   * 获取每日趋势
   */
  private static async getDailyTrend(
    where: Prisma.InquiryWhereInput,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    // 这里使用原生SQL查询来获取每日统计
    const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const result = await prisma.$queryRaw`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as count,
        SUM(estimated_value) as total_value
      FROM inquiries 
      WHERE created_at >= ${start} AND created_at <= ${end}
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    return result as any[];
  }

  /**
   * 获取每月趋势
   */
  private static async getMonthlyTrend(
    where: Prisma.InquiryWhereInput,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    // 这里使用原生SQL查询来获取每月统计
    const start = startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
    const end = endDate || new Date();

    const result = await prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        COUNT(*) as count,
        SUM(estimated_value) as total_value
      FROM inquiries 
      WHERE created_at >= ${start} AND created_at <= ${end}
      GROUP BY DATE_FORMAT(created_at, '%Y-%m')
      ORDER BY month ASC
    `;

    return result as any[];
  }

  /**
   * 导出统计数据
   */
  static async exportStatistics(
    params: StatisticsParams,
    format: 'excel' | 'csv' = 'excel'
  ): Promise<Buffer> {
    const statistics = await this.getInquiryStatistics(params);
    
    // TODO: 实现Excel/CSV导出
    // 这里返回一个空的Buffer作为占位符
    return Buffer.from('');
  }
}
