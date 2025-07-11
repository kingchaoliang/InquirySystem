import { CustomFieldDefinition, CustomFieldType, CustomFieldStatus, UserCustomFieldConfig, Prisma } from '@prisma/client';
import prisma from '@/utils/database';
import { AppError } from '@/middleware/errorHandler';
import { logInfo } from '@/utils/logger';

export interface CustomFieldListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  fieldType?: CustomFieldType;
  status?: CustomFieldStatus;
}

export interface CreateCustomFieldData {
  fieldName: string;
  fieldKey: string;
  fieldType: CustomFieldType;
  fieldOptions?: string[];
  defaultValue?: string;
  isRequired?: boolean;
  isSearchable?: boolean;
  displayOrder?: number;
  validationRules?: Record<string, any>;
  description?: string;
  status?: CustomFieldStatus;
  createdBy: number;
}

export interface UpdateCustomFieldData {
  fieldName?: string;
  fieldKey?: string;
  fieldType?: CustomFieldType;
  fieldOptions?: string[];
  defaultValue?: string;
  isRequired?: boolean;
  isSearchable?: boolean;
  displayOrder?: number;
  validationRules?: Record<string, any>;
  description?: string;
  status?: CustomFieldStatus;
}

export interface UserCustomFieldConfigData {
  fieldId: number;
  isVisible: boolean;
  displayOrder: number;
  columnWidth?: number;
}

export interface CustomFieldListResult {
  fields: CustomFieldDefinition[];
  total: number;
  page: number;
  pageSize: number;
}

export class CustomFieldService {
  /**
   * 获取自定义字段定义列表
   */
  static async getCustomFieldList(params: CustomFieldListParams): Promise<CustomFieldListResult> {
    const {
      page = 1,
      pageSize = 20,
      search,
      fieldType,
      status,
    } = params;

    const skip = (page - 1) * pageSize;
    const take = pageSize;

    // 构建查询条件
    const where: Prisma.CustomFieldDefinitionWhereInput = {};

    if (search) {
      where.OR = [
        { fieldName: { contains: search } },
        { fieldKey: { contains: search } },
        { description: { contains: search } },
      ];
    }

    if (fieldType) {
      where.fieldType = fieldType;
    }

    if (status) {
      where.status = status;
    }

    // 查询自定义字段列表
    const [fields, total] = await Promise.all([
      prisma.customFieldDefinition.findMany({
        where,
        skip,
        take,
        orderBy: [
          { displayOrder: 'asc' },
          { createdAt: 'desc' },
        ],
      }),
      prisma.customFieldDefinition.count({ where }),
    ]);

    return {
      fields,
      total,
      page,
      pageSize,
    };
  }

  /**
   * 获取所有激活的自定义字段
   */
  static async getActiveCustomFields(): Promise<CustomFieldDefinition[]> {
    return prisma.customFieldDefinition.findMany({
      where: {
        status: CustomFieldStatus.active,
      },
      orderBy: [
        { displayOrder: 'asc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * 根据ID获取自定义字段详情
   */
  static async getCustomFieldById(id: number): Promise<CustomFieldDefinition | null> {
    return prisma.customFieldDefinition.findUnique({
      where: { id },
    });
  }

  /**
   * 创建自定义字段定义
   */
  static async createCustomField(fieldData: CreateCustomFieldData): Promise<CustomFieldDefinition> {
    const {
      fieldName,
      fieldKey,
      fieldType,
      fieldOptions,
      defaultValue,
      isRequired = false,
      isSearchable = true,
      displayOrder = 0,
      validationRules,
      description,
      status = CustomFieldStatus.active,
      createdBy,
    } = fieldData;

    // 检查字段键名是否已存在
    const existingField = await prisma.customFieldDefinition.findUnique({
      where: { fieldKey },
    });

    if (existingField) {
      throw new AppError('字段键名已存在', 409);
    }

    // 验证字段选项（对于select类型字段）
    if ((fieldType === 'select' || fieldType === 'multiselect') && (!fieldOptions || fieldOptions.length === 0)) {
      throw new AppError('选择类型字段必须提供选项', 400);
    }

    // 创建自定义字段定义
    const field = await prisma.customFieldDefinition.create({
      data: {
        fieldName,
        fieldKey,
        fieldType,
        fieldOptions,
        defaultValue,
        isRequired,
        isSearchable,
        displayOrder,
        validationRules,
        description,
        status,
        createdBy,
      },
    });

    logInfo(`Custom field created: ${field.fieldName}`, { fieldId: field.id, createdBy });

    return field;
  }

  /**
   * 更新自定义字段定义
   */
  static async updateCustomField(id: number, fieldData: UpdateCustomFieldData): Promise<CustomFieldDefinition> {
    const {
      fieldName,
      fieldKey,
      fieldType,
      fieldOptions,
      defaultValue,
      isRequired,
      isSearchable,
      displayOrder,
      validationRules,
      description,
      status,
    } = fieldData;

    // 检查字段是否存在
    const existingField = await prisma.customFieldDefinition.findUnique({
      where: { id },
    });

    if (!existingField) {
      throw new AppError('自定义字段不存在', 404);
    }

    // 检查字段键名是否已被其他字段使用
    if (fieldKey && fieldKey !== existingField.fieldKey) {
      const duplicateField = await prisma.customFieldDefinition.findUnique({
        where: { fieldKey },
      });

      if (duplicateField) {
        throw new AppError('字段键名已存在', 409);
      }
    }

    // 验证字段选项（对于select类型字段）
    if (fieldType && (fieldType === 'select' || fieldType === 'multiselect') && (!fieldOptions || fieldOptions.length === 0)) {
      throw new AppError('选择类型字段必须提供选项', 400);
    }

    // 更新自定义字段定义
    const field = await prisma.customFieldDefinition.update({
      where: { id },
      data: {
        ...(fieldName && { fieldName }),
        ...(fieldKey && { fieldKey }),
        ...(fieldType && { fieldType }),
        ...(fieldOptions !== undefined && { fieldOptions }),
        ...(defaultValue !== undefined && { defaultValue }),
        ...(isRequired !== undefined && { isRequired }),
        ...(isSearchable !== undefined && { isSearchable }),
        ...(displayOrder !== undefined && { displayOrder }),
        ...(validationRules !== undefined && { validationRules }),
        ...(description !== undefined && { description }),
        ...(status && { status }),
      },
    });

    logInfo(`Custom field updated: ${field.fieldName}`, { fieldId: field.id });

    return field;
  }

  /**
   * 删除自定义字段定义
   */
  static async deleteCustomField(id: number): Promise<void> {
    // 检查字段是否存在
    const field = await prisma.customFieldDefinition.findUnique({
      where: { id },
    });

    if (!field) {
      throw new AppError('自定义字段不存在', 404);
    }

    // 检查是否有询盘使用了此字段
    const inquiryCount = await prisma.inquiry.count({
      where: {
        customFields: {
          path: [field.fieldKey],
          not: null,
        },
      },
    });

    if (inquiryCount > 0) {
      throw new AppError('该字段正在被使用，无法删除', 400);
    }

    // 删除字段定义（级联删除用户配置）
    await prisma.customFieldDefinition.delete({
      where: { id },
    });

    logInfo(`Custom field deleted: ${field.fieldName}`, { fieldId: field.id });
  }

  /**
   * 获取用户自定义字段配置
   */
  static async getUserCustomFieldConfigs(userId: number): Promise<UserCustomFieldConfig[]> {
    return prisma.userCustomFieldConfig.findMany({
      where: { userId },
      include: {
        field: true,
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });
  }

  /**
   * 更新用户自定义字段配置
   */
  static async updateUserCustomFieldConfigs(
    userId: number,
    configs: UserCustomFieldConfigData[]
  ): Promise<void> {
    // 删除用户现有配置
    await prisma.userCustomFieldConfig.deleteMany({
      where: { userId },
    });

    // 创建新配置
    if (configs.length > 0) {
      await prisma.userCustomFieldConfig.createMany({
        data: configs.map(config => ({
          userId,
          fieldId: config.fieldId,
          isVisible: config.isVisible,
          displayOrder: config.displayOrder,
          columnWidth: config.columnWidth,
        })),
      });
    }

    logInfo(`User custom field configs updated`, { userId, configCount: configs.length });
  }

  /**
   * 重置用户自定义字段配置为默认值
   */
  static async resetUserCustomFieldConfigs(userId: number): Promise<void> {
    // 删除用户现有配置
    await prisma.userCustomFieldConfig.deleteMany({
      where: { userId },
    });

    // 获取所有激活的字段
    const activeFields = await this.getActiveCustomFields();

    // 创建默认配置
    if (activeFields.length > 0) {
      await prisma.userCustomFieldConfig.createMany({
        data: activeFields.map((field, index) => ({
          userId,
          fieldId: field.id,
          isVisible: true,
          displayOrder: field.displayOrder || index,
          columnWidth: 150,
        })),
      });
    }

    logInfo(`User custom field configs reset to default`, { userId });
  }

  /**
   * 获取用户可见的自定义字段（用于表格显示）
   */
  static async getUserVisibleCustomFields(userId: number): Promise<{
    field: CustomFieldDefinition;
    config: UserCustomFieldConfig;
  }[]> {
    const configs = await prisma.userCustomFieldConfig.findMany({
      where: {
        userId,
        isVisible: true,
      },
      include: {
        field: {
          where: {
            status: CustomFieldStatus.active,
          },
        },
      },
      orderBy: {
        displayOrder: 'asc',
      },
    });

    return configs
      .filter(config => config.field)
      .map(config => ({
        field: config.field!,
        config,
      }));
  }

  /**
   * 批量更新字段显示顺序
   */
  static async updateFieldDisplayOrder(fieldOrders: { id: number; displayOrder: number }[]): Promise<void> {
    // 使用事务批量更新
    await prisma.$transaction(
      fieldOrders.map(({ id, displayOrder }) =>
        prisma.customFieldDefinition.update({
          where: { id },
          data: { displayOrder },
        })
      )
    );

    logInfo(`Custom field display order updated`, { fieldCount: fieldOrders.length });
  }
}
