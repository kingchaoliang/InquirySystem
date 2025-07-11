declare namespace API {
  type CurrentUser = {
    id?: number;
    name?: string;
    avatar?: string;
    userid?: string;
    email?: string;
    signature?: string;
    title?: string;
    group?: string;
    tags?: { key?: string; label?: string }[];
    notifyCount?: number;
    unreadCount?: number;
    country?: string;
    access?: string;
    geographic?: {
      province?: { label?: string; key?: string };
      city?: { label?: string; key?: string };
    };
    address?: string;
    phone?: string;
    role?: string;
    departmentId?: number;
  };

  type LoginResult = {
    status?: string;
    type?: string;
    currentAuthority?: string;
    token?: string;
    user?: CurrentUser;
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

  // 用户相关类型
  type User = {
    id: number;
    username: string;
    email: string;
    fullName: string;
    role: string;
    departmentId?: number;
    phone?: string;
    avatarUrl?: string;
    status: string;
    lastLoginAt?: string;
    createdAt: string;
    updatedAt: string;
    department?: Department;
  };

  // 部门类型
  type Department = {
    id: number;
    name: string;
    description?: string;
    parentId?: number;
    level: number;
    path: string;
    status: string;
    createdAt: string;
    updatedAt: string;
    children?: Department[];
    parent?: Department;
  };

  // 询盘类型
  type Inquiry = {
    id: number;
    inquiryNo: string;
    title: string;
    content: string;
    customerName: string;
    customerEmail?: string;
    customerPhone?: string;
    customerType: string;
    sourceChannel: string;
    status: string;
    priority: string;
    estimatedValue?: number;
    departmentId?: number;
    assignedTo?: number;
    createdBy: number;
    createdAt: string;
    updatedAt: string;
    customFields?: Record<string, any>;
    department?: Department;
    assignee?: User;
    creator?: User;
  };

  // 自定义字段定义
  type CustomFieldDefinition = {
    id: number;
    fieldName: string;
    fieldKey: string;
    fieldType: string;
    fieldOptions?: string[];
    defaultValue?: string;
    isRequired: boolean;
    isSearchable: boolean;
    displayOrder: number;
    validationRules?: Record<string, any>;
    description?: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  };

  // 用户自定义字段配置
  type UserCustomFieldConfig = {
    id: number;
    userId: number;
    fieldId: number;
    isVisible: boolean;
    displayOrder: number;
    columnWidth?: number;
    createdAt: string;
    updatedAt: string;
    field?: CustomFieldDefinition;
  };

  // AI分析记录
  type AIAnalysisRecord = {
    id: number;
    inquiryId: number;
    aiProvider: string;
    modelName: string;
    analysisType: string;
    inputData: Record<string, any>;
    outputData?: Record<string, any>;
    confidenceScore?: number;
    processingTimeMs?: number;
    status: string;
    errorMessage?: string;
    createdBy: number;
    createdAt: string;
    updatedAt: string;
    inquiry?: Inquiry;
    creator?: User;
  };

  // 跟进记录
  type FollowUpRecord = {
    id: number;
    inquiryId: number;
    followUpType: string;
    content: string;
    result?: string;
    nextFollowUpDate?: string;
    attachments?: string[];
    createdBy: number;
    createdAt: string;
    updatedAt: string;
    inquiry?: Inquiry;
    creator?: User;
  };
}
