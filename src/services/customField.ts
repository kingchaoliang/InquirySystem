import { request } from '@umijs/max';

/** 获取自定义字段定义列表 */
export async function getCustomFieldDefinitions(params?: {
  page?: number;
  pageSize?: number;
  search?: string;
  fieldType?: string;
  status?: string;
}) {
  return request<{
    success: boolean;
    data: {
      fields: API.CustomFieldDefinition[];
      total: number;
      page: number;
      pageSize: number;
    };
    message: string;
  }>('/api/custom-fields/definitions', {
    method: 'GET',
    params,
  });
}

/** 获取所有激活的自定义字段 */
export async function getActiveCustomFields() {
  return request<{
    success: boolean;
    data: API.CustomFieldDefinition[];
    message: string;
  }>('/api/custom-fields/definitions/active', {
    method: 'GET',
  });
}

/** 创建自定义字段定义 */
export async function createCustomFieldDefinition(data: {
  fieldName: string;
  fieldKey: string;
  fieldType: string;
  fieldOptions?: string[];
  defaultValue?: string;
  isRequired?: boolean;
  isSearchable?: boolean;
  displayOrder?: number;
  validationRules?: Record<string, any>;
  description?: string;
  status?: string;
}) {
  return request<{
    success: boolean;
    data: API.CustomFieldDefinition;
    message: string;
  }>('/api/custom-fields/definitions', {
    method: 'POST',
    data,
  });
}

/** 更新自定义字段定义 */
export async function updateCustomFieldDefinition(id: number, data: Partial<{
  fieldName: string;
  fieldKey: string;
  fieldType: string;
  fieldOptions: string[];
  defaultValue: string;
  isRequired: boolean;
  isSearchable: boolean;
  displayOrder: number;
  validationRules: Record<string, any>;
  description: string;
  status: string;
}>) {
  return request<{
    success: boolean;
    data: API.CustomFieldDefinition;
    message: string;
  }>(`/api/custom-fields/definitions/${id}`, {
    method: 'PUT',
    data,
  });
}

/** 删除自定义字段定义 */
export async function deleteCustomFieldDefinition(id: number) {
  return request<{
    success: boolean;
    message: string;
  }>(`/api/custom-fields/definitions/${id}`, {
    method: 'DELETE',
  });
}

/** 获取用户自定义字段配置 */
export async function getUserCustomFieldConfigs() {
  return request<{
    success: boolean;
    data: API.UserCustomFieldConfig[];
    message: string;
  }>('/api/custom-fields/user-configs', {
    method: 'GET',
  });
}

/** 获取用户可见的自定义字段 */
export async function getUserVisibleCustomFields() {
  return request<{
    success: boolean;
    data: {
      field: API.CustomFieldDefinition;
      config: API.UserCustomFieldConfig;
    }[];
    message: string;
  }>('/api/custom-fields/user-visible', {
    method: 'GET',
  });
}

/** 更新用户自定义字段配置 */
export async function updateUserCustomFieldConfigs(configs: {
  fieldId: number;
  isVisible: boolean;
  displayOrder: number;
  columnWidth?: number;
}[]) {
  return request<{
    success: boolean;
    message: string;
  }>('/api/custom-fields/user-configs', {
    method: 'PUT',
    data: { configs },
  });
}

/** 重置用户自定义字段配置为默认值 */
export async function resetUserCustomFieldConfigs() {
  return request<{
    success: boolean;
    message: string;
  }>('/api/custom-fields/user-configs/reset', {
    method: 'POST',
  });
}
