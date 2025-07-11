import { request } from '@umijs/max';

/** 获取询盘列表 */
export async function getInquiryList(params: API.InquiryListParams) {
  return request<API.InquiryListResult>('/api/inquiries', {
    method: 'GET',
    params,
  });
}

/** 获取询盘详情 */
export async function getInquiryDetail(id: number) {
  return request<{
    success: boolean;
    data: API.InquiryItem;
    message: string;
  }>(`/api/inquiries/${id}`, {
    method: 'GET',
  });
}

/** 创建询盘 */
export async function createInquiry(data: Partial<API.InquiryItem>) {
  return request<{
    success: boolean;
    data: API.InquiryItem;
    message: string;
  }>('/api/inquiries', {
    method: 'POST',
    data,
  });
}

/** 更新询盘 */
export async function updateInquiry(id: number, data: Partial<API.InquiryItem>) {
  return request<{
    success: boolean;
    data: API.InquiryItem;
    message: string;
  }>(`/api/inquiries/${id}`, {
    method: 'PUT',
    data,
  });
}

/** 删除询盘 */
export async function deleteInquiry(id: number) {
  return request<{
    success: boolean;
    message: string;
  }>(`/api/inquiries/${id}`, {
    method: 'DELETE',
  });
}

/** 批量操作询盘 */
export async function batchUpdateInquiries(data: {
  ids: number[];
  action: 'assign' | 'updateStatus' | 'delete';
  data?: any;
}) {
  return request<{
    success: boolean;
    message: string;
  }>('/api/inquiries/batch', {
    method: 'PATCH',
    data,
  });
}

/** 获取用户列表（用于分配） */
export async function getUserList(params?: {
  page?: number;
  pageSize?: number;
  role?: string;
  departmentId?: number;
}) {
  return request<{
    success: boolean;
    data: {
      users: API.CurrentUser[];
      total: number;
      page: number;
      pageSize: number;
    };
    message: string;
  }>('/api/users', {
    method: 'GET',
    params,
  });
}

/** 获取部门列表 */
export async function getDepartmentList() {
  return request<{
    success: boolean;
    data: {
      departments: any[];
      total: number;
    };
    message: string;
  }>('/api/departments', {
    method: 'GET',
    params: { pageSize: 1000 },
  });
}

/** 获取部门树形结构 */
export async function getDepartmentTree() {
  return request<{
    success: boolean;
    data: any[];
    message: string;
  }>('/api/departments/tree', {
    method: 'GET',
  });
}
