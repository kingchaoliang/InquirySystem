import { Department, DepartmentStatus, Prisma } from '@prisma/client';
import prisma from '@/utils/database';
import { AppError } from '@/middleware/errorHandler';
import { logInfo } from '@/utils/logger';

export interface DepartmentListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: DepartmentStatus;
  parentId?: number;
}

export interface CreateDepartmentData {
  name: string;
  description?: string;
  parentId?: number;
  managerId?: number;
  status?: DepartmentStatus;
}

export interface UpdateDepartmentData {
  name?: string;
  description?: string;
  parentId?: number;
  managerId?: number;
  status?: DepartmentStatus;
}

export interface DepartmentWithRelations extends Department {
  parent?: Department | null;
  manager?: {
    id: number;
    fullName: string;
    email: string;
  } | null;
  children?: Department[];
  _count?: {
    users: number;
    children: number;
  };
}

export interface DepartmentListResult {
  departments: DepartmentWithRelations[];
  total: number;
  page: number;
  pageSize: number;
}

export class DepartmentService {
  /**
   * 获取部门列表
   */
  static async getDepartmentList(params: DepartmentListParams): Promise<DepartmentListResult> {
    const {
      page = 1,
      pageSize = 20,
      search,
      status,
      parentId,
    } = params;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 构建查询条件
    const where: Prisma.DepartmentWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (status) {
      where.status = status;
    }

    if (parentId !== undefined) {
      where.parentId = parentId;
    }

    // 查询部门列表
    const [departments, total] = await Promise.all([
      prisma.department.findMany({
        where,
        skip,
        take,
        include: {
          parent: {
            select: {
              id: true,
              name: true,
            },
          },
          manager: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
          children: {
            select: {
              id: true,
              name: true,
              status: true,
            },
          },
          _count: {
            select: {
              users: true,
              children: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.department.count({ where }),
    ]);

    return {
      departments,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取部门树形结构
   */
  static async getDepartmentTree(): Promise<DepartmentWithRelations[]> {
    const departments = await prisma.department.findMany({
      where: {
        status: DepartmentStatus.active,
      },
      include: {
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        _count: {
          select: {
            users: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    // 构建树形结构
    const departmentMap = new Map<number, DepartmentWithRelations>();
    const rootDepartments: DepartmentWithRelations[] = [];

    // 创建部门映射
    departments.forEach(dept => {
      departmentMap.set(dept.id, { ...dept, children: [] });
    });

    // 构建父子关系
    departments.forEach(dept => {
      const department = departmentMap.get(dept.id)!;
      if (dept.parentId) {
        const parent = departmentMap.get(dept.parentId);
        if (parent) {
          parent.children!.push(department);
        }
      } else {
        rootDepartments.push(department);
      }
    });

    return rootDepartments;
  }

  /**
   * 根据ID获取部门详情
   */
  static async getDepartmentById(id: number): Promise<DepartmentWithRelations | null> {
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            users: true,
            children: true,
          },
        },
      },
    });

    return department;
  }

  /**
   * 创建部门
   */
  static async createDepartment(departmentData: CreateDepartmentData): Promise<DepartmentWithRelations> {
    const {
      name,
      description,
      parentId,
      managerId,
      status = DepartmentStatus.active,
    } = departmentData;

    // 检查部门名称是否已存在
    const existingDepartment = await prisma.department.findFirst({
      where: {
        name,
        parentId,
      },
    });

    if (existingDepartment) {
      throw new AppError('同级部门名称已存在', 409);
    }

    // 验证父部门是否存在
    if (parentId) {
      const parentDepartment = await prisma.department.findUnique({
        where: { id: parentId },
      });

      if (!parentDepartment) {
        throw new AppError('父部门不存在', 400);
      }
    }

    // 验证管理员是否存在
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
      });

      if (!manager) {
        throw new AppError('指定的管理员不存在', 400);
      }
    }

    // 创建部门
    const department = await prisma.department.create({
      data: {
        name,
        description,
        parentId,
        managerId,
        status,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            users: true,
            children: true,
          },
        },
      },
    });

    logInfo(`Department created: ${department.name}`, { departmentId: department.id });

    return department;
  }

  /**
   * 更新部门信息
   */
  static async updateDepartment(id: number, departmentData: UpdateDepartmentData): Promise<DepartmentWithRelations> {
    const { name, description, parentId, managerId, status } = departmentData;

    // 检查部门是否存在
    const existingDepartment = await prisma.department.findUnique({
      where: { id },
    });

    if (!existingDepartment) {
      throw new AppError('部门不存在', 404);
    }

    // 检查部门名称是否已被其他部门使用
    if (name && name !== existingDepartment.name) {
      const duplicateDepartment = await prisma.department.findFirst({
        where: {
          name,
          parentId: parentId !== undefined ? parentId : existingDepartment.parentId,
          id: { not: id },
        },
      });

      if (duplicateDepartment) {
        throw new AppError('同级部门名称已存在', 409);
      }
    }

    // 验证父部门是否存在（不能设置自己为父部门）
    if (parentId !== undefined) {
      if (parentId === id) {
        throw new AppError('不能设置自己为父部门', 400);
      }

      if (parentId) {
        const parentDepartment = await prisma.department.findUnique({
          where: { id: parentId },
        });

        if (!parentDepartment) {
          throw new AppError('父部门不存在', 400);
        }

        // 检查是否会形成循环引用
        const isCircular = await this.checkCircularReference(id, parentId);
        if (isCircular) {
          throw new AppError('不能设置子部门为父部门', 400);
        }
      }
    }

    // 验证管理员是否存在
    if (managerId) {
      const manager = await prisma.user.findUnique({
        where: { id: managerId },
      });

      if (!manager) {
        throw new AppError('指定的管理员不存在', 400);
      }
    }

    // 更新部门
    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(parentId !== undefined && { parentId }),
        ...(managerId !== undefined && { managerId }),
        ...(status && { status }),
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        manager: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        _count: {
          select: {
            users: true,
            children: true,
          },
        },
      },
    });

    logInfo(`Department updated: ${department.name}`, { departmentId: department.id });

    return department;
  }

  /**
   * 删除部门
   */
  static async deleteDepartment(id: number): Promise<void> {
    // 检查部门是否存在
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            users: true,
            children: true,
          },
        },
      },
    });

    if (!department) {
      throw new AppError('部门不存在', 404);
    }

    // 检查是否有子部门
    if (department._count.children > 0) {
      throw new AppError('该部门有子部门，无法删除', 400);
    }

    // 检查是否有用户
    if (department._count.users > 0) {
      throw new AppError('该部门有用户，无法删除', 400);
    }

    // 删除部门
    await prisma.department.delete({
      where: { id },
    });

    logInfo(`Department deleted: ${department.name}`, { departmentId: department.id });
  }

  /**
   * 检查循环引用
   */
  private static async checkCircularReference(departmentId: number, parentId: number): Promise<boolean> {
    let currentParentId = parentId;
    
    while (currentParentId) {
      if (currentParentId === departmentId) {
        return true;
      }
      
      const parent = await prisma.department.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });
      
      if (!parent) {
        break;
      }
      
      currentParentId = parent.parentId;
    }
    
    return false;
  }
}
