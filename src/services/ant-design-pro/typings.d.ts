// @ts-ignore
/* eslint-disable */

declare namespace API {
  type CurrentUser = {
    id?: number;
    username?: string;
    email?: string;
    fullName?: string;
    role?: string;
    departmentId?: number;
    phone?: string;
    avatarUrl?: string;
    status?: string;
    lastLoginAt?: string;
    createdAt?: string;
    updatedAt?: string;
  };

  type LoginResult = {
    success: boolean;
    message: string;
    data: {
      token: string;
      user: CurrentUser;
    };
  };

  type LoginParams = {
    email?: string;
    password?: string;
    autoLogin?: boolean;
    type?: string;
  };

  type RegisterParams = {
    username?: string;
    email?: string;
    password?: string;
    fullName?: string;
    phone?: string;
  };

  type PageParams = {
    current?: number;
    pageSize?: number;
  };

  type RuleListItem = {
    key?: number;
    disabled?: boolean;
    href?: string;
    avatar?: string;
    name?: string;
    owner?: string;
    desc?: string;
    callNo?: number;
    status?: number;
    updatedAt?: string;
    createdAt?: string;
    progress?: number;
  };

  type RuleList = {
    data?: RuleListItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type FakeCaptcha = {
    code?: number;
    status?: string;
  };

  type NoticeIconListItem = {
    id?: string;
    extra?: string;
    key?: string;
    read?: boolean;
    avatar?: string;
    title?: string;
    status?: string;
    datetime?: string;
    description?: string;
    type?: NoticeIconItemType;
  };

  type NoticeIconItemType = 'notification' | 'message' | 'event';

  type NoticeIconList = {
    data?: NoticeIconListItem[];
    /** 列表的内容总数 */
    total?: number;
    success?: boolean;
  };

  type ErrorResponse = {
    /** 业务约定的错误码 */
    errorCode: string;
    /** 业务上的错误信息 */
    errorMessage?: string;
    /** 业务上的请求是否成功 */
    success?: boolean;
  };

  // 询盘相关类型定义
  type InquiryItem = {
    id: number;
    inquiryNo: string;
    title: string;
    content: string;
    sourceChannel: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    customerCompany?: string;
    customerAddress?: string;
    customerType: 'individual' | 'enterprise' | 'government' | 'other';
    region?: string;
    country?: string;
    assignedTo?: number;
    departmentId?: number;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    status: 'new' | 'contacted' | 'quoted' | 'negotiating' | 'won' | 'lost' | 'closed';
    estimatedValue?: number;
    currency?: string;
    expectedCloseDate?: string;
    aiAnalysisScore?: number;
    aiAnalysisSummary?: string;
    tags?: string[];
    customFields?: Record<string, any>;
    createdBy: number;
    createdAt: string;
    updatedAt: string;
  };

  type InquiryListParams = {
    current?: number;
    pageSize?: number;
    status?: string;
    assignedTo?: number;
    departmentId?: number;
    sourceChannel?: string;
    search?: string;
    startDate?: string;
    endDate?: string;
  };

  type InquiryListResult = {
    data: InquiryItem[];
    total: number;
    success: boolean;
  };

  // 自定义字段相关类型定义
  type CustomFieldDefinition = {
    id: number;
    fieldName: string;
    fieldKey: string;
    fieldType: 'text' | 'number' | 'date' | 'datetime' | 'select' | 'multiselect' | 'boolean' | 'textarea';
    fieldOptions?: string[];
    defaultValue?: string;
    isRequired: boolean;
    isSearchable: boolean;
    displayOrder: number;
    validationRules?: Record<string, any>;
    description?: string;
    status: 'active' | 'inactive';
    createdBy: number;
    createdAt: string;
    updatedAt: string;
  };

  type UserCustomFieldConfig = {
    id: number;
    userId: number;
    fieldId: number;
    isVisible: boolean;
    displayOrder: number;
    columnWidth?: number;
    createdAt: string;
    updatedAt: string;
  };

  // AI分析相关类型定义
  type AiAnalysisRecord = {
    id: number;
    inquiryId: number;
    aiProvider: 'openai' | 'deepseek' | 'gemini';
    modelName: string;
    analysisType: 'content_analysis' | 'intent_analysis' | 'sentiment_analysis' | 'recommendation';
    inputData: Record<string, any>;
    outputData: Record<string, any>;
    confidenceScore?: number;
    processingTimeMs?: number;
    costAmount?: number;
    status: 'pending' | 'completed' | 'failed';
    errorMessage?: string;
    createdBy: number;
    createdAt: string;
  };

  // 跟进记录相关类型定义
  type FollowUpRecord = {
    id: number;
    inquiryId: number;
    followUpType: 'phone' | 'email' | 'wechat' | 'meeting' | 'visit' | 'other';
    content: string;
    result?: 'no_answer' | 'interested' | 'not_interested' | 'need_more_info' | 'quoted' | 'negotiating' | 'closed';
    nextFollowUpDate?: string;
    attachments?: string[];
    createdBy: number;
    createdAt: string;
    updatedAt: string;
  };
}
