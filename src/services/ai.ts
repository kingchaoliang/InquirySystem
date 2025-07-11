import { request } from '@umijs/max';

/** 执行AI分析 */
export async function performAIAnalysis(data: {
  inquiryId: number;
  analysisType: string;
  aiProvider?: string;
  modelName?: string;
}) {
  return request<{
    success: boolean;
    data: API.AIAnalysisRecord;
    message: string;
  }>('/api/ai/analyze', {
    method: 'POST',
    data,
  });
}

/** 获取AI分析历史 */
export async function getAIAnalysisHistory(
  inquiryId?: number,
  params?: {
    page?: number;
    pageSize?: number;
    analysisType?: string;
    aiProvider?: string;
    startDate?: string;
    endDate?: string;
  }
) {
  const url = inquiryId ? `/api/ai/history/${inquiryId}` : '/api/ai/history';
  return request<{
    success: boolean;
    data: API.AIAnalysisRecord[];
    message: string;
  }>(url, {
    method: 'GET',
    params,
  });
}

/** 批量AI分析 */
export async function batchAIAnalysis(data: {
  inquiryIds: number[];
  analysisType: string;
  aiProvider: string;
}) {
  return request<{
    success: boolean;
    data: { count: number };
    message: string;
  }>('/api/ai/batch-analyze', {
    method: 'POST',
    data,
  });
}

/** 获取AI分析统计 */
export async function getAIAnalysisStatistics(params?: {
  startDate?: string;
  endDate?: string;
  aiProvider?: string;
}) {
  return request<{
    success: boolean;
    data: {
      totalAnalyses: number;
      successRate: number;
      averageProcessingTime: number;
      totalCost: number;
      providerStats: any[];
    };
    message: string;
  }>('/api/ai/statistics', {
    method: 'GET',
    params,
  });
}

/** 测试AI连接 */
export async function testAIConnection(data: {
  aiProvider: string;
  apiKey?: string;
}) {
  return request<{
    success: boolean;
    data: {
      connected: boolean;
      latency: number;
      error?: string;
    };
    message: string;
  }>('/api/ai/test-connection', {
    method: 'POST',
    data,
  });
}

/** 获取AI配置 */
export async function getAIConfig() {
  return request<{
    success: boolean;
    data: {
      providers: string[];
      models: string[];
      defaultProvider: string;
      defaultModel: string;
    };
    message: string;
  }>('/api/ai/config', {
    method: 'GET',
  });
}

/** 更新AI配置 */
export async function updateAIConfig(data: {
  providers?: any[];
  models?: any[];
  defaultProvider?: string;
  defaultModel?: string;
  apiKeys?: Record<string, string>;
}) {
  return request<{
    success: boolean;
    message: string;
  }>('/api/ai/config', {
    method: 'PUT',
    data,
  });
}
