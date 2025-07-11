import { AiAnalysisRecord, AiProvider, AnalysisType, AnalysisStatus, Prisma } from '@prisma/client';
import prisma from '@/utils/database';
import { AppError } from '@/middleware/errorHandler';
import { logInfo, logError } from '@/utils/logger';
import axios from 'axios';

export interface AiAnalysisParams {
  inquiryId: number;
  analysisType: AnalysisType;
  aiProvider?: AiProvider;
  modelName?: string;
  createdBy: number;
}

export interface AiAnalysisResult {
  confidence: number;
  summary: string;
  details: Record<string, any>;
  recommendations?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
  intent?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AiConfig {
  openai: {
    apiKey: string;
    baseURL: string;
    model: string;
  };
  deepseek: {
    apiKey: string;
    baseURL: string;
    model: string;
  };
  gemini: {
    apiKey: string;
    baseURL: string;
    model: string;
  };
}

export class AiService {
  private static aiConfig: AiConfig = {
    openai: {
      apiKey: process.env.OPENAI_API_KEY || '',
      baseURL: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
    },
    deepseek: {
      apiKey: process.env.DEEPSEEK_API_KEY || '',
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
      baseURL: process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1',
      model: process.env.GEMINI_MODEL || 'gemini-pro',
    },
  };

  /**
   * 执行AI分析
   */
  static async performAnalysis(params: AiAnalysisParams): Promise<AiAnalysisRecord> {
    const {
      inquiryId,
      analysisType,
      aiProvider = 'openai',
      modelName,
      createdBy,
    } = params;

    // 获取询盘信息
    const inquiry = await prisma.inquiry.findUnique({
      where: { id: inquiryId },
      include: {
        creator: {
          select: { fullName: true, email: true },
        },
      },
    });

    if (!inquiry) {
      throw new AppError('询盘不存在', 404);
    }

    // 创建分析记录
    const analysisRecord = await prisma.aiAnalysisRecord.create({
      data: {
        inquiryId,
        aiProvider,
        modelName: modelName || this.aiConfig[aiProvider].model,
        analysisType,
        inputData: {
          title: inquiry.title,
          content: inquiry.content,
          customerName: inquiry.customerName,
          customerType: inquiry.customerType,
          sourceChannel: inquiry.sourceChannel,
          estimatedValue: inquiry.estimatedValue,
        },
        status: AnalysisStatus.pending,
        createdBy,
      },
    });

    try {
      const startTime = Date.now();

      // 执行AI分析
      const result = await this.callAiProvider(
        aiProvider,
        analysisType,
        inquiry,
        modelName || this.aiConfig[aiProvider].model
      );

      const processingTime = Date.now() - startTime;

      // 更新分析记录
      const updatedRecord = await prisma.aiAnalysisRecord.update({
        where: { id: analysisRecord.id },
        data: {
          outputData: result,
          confidenceScore: result.confidence,
          processingTimeMs: processingTime,
          status: AnalysisStatus.completed,
        },
      });

      logInfo(`AI analysis completed`, {
        analysisId: analysisRecord.id,
        inquiryId,
        aiProvider,
        analysisType,
        processingTime,
      });

      return updatedRecord;
    } catch (error) {
      // 更新分析记录为失败状态
      await prisma.aiAnalysisRecord.update({
        where: { id: analysisRecord.id },
        data: {
          status: AnalysisStatus.failed,
          errorMessage: (error as Error).message,
        },
      });

      logError('AI analysis failed', error as Error, {
        analysisId: analysisRecord.id,
        inquiryId,
        aiProvider,
        analysisType,
      });

      throw error;
    }
  }

  /**
   * 调用AI提供商API
   */
  private static async callAiProvider(
    provider: AiProvider,
    analysisType: AnalysisType,
    inquiry: any,
    model: string
  ): Promise<AiAnalysisResult> {
    const prompt = this.generatePrompt(analysisType, inquiry);

    switch (provider) {
      case 'openai':
        return this.callOpenAI(prompt, model);
      case 'deepseek':
        return this.callDeepSeek(prompt, model);
      case 'gemini':
        return this.callGemini(prompt, model);
      default:
        throw new AppError(`不支持的AI提供商: ${provider}`, 400);
    }
  }

  /**
   * 调用OpenAI API
   */
  private static async callOpenAI(prompt: string, model: string): Promise<AiAnalysisResult> {
    const config = this.aiConfig.openai;
    
    if (!config.apiKey) {
      throw new AppError('OpenAI API密钥未配置', 500);
    }

    try {
      const response = await axios.post(
        `${config.baseURL}/chat/completions`,
        {
          model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的CRM询盘分析助手，请根据询盘内容进行分析并返回JSON格式的结果。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const content = response.data.choices[0].message.content;
      return this.parseAiResponse(content);
    } catch (error: any) {
      logError('OpenAI API call failed', error);
      throw new AppError(`OpenAI分析失败: ${error.message}`, 500);
    }
  }

  /**
   * 调用DeepSeek API
   */
  private static async callDeepSeek(prompt: string, model: string): Promise<AiAnalysisResult> {
    const config = this.aiConfig.deepseek;
    
    if (!config.apiKey) {
      throw new AppError('DeepSeek API密钥未配置', 500);
    }

    try {
      const response = await axios.post(
        `${config.baseURL}/chat/completions`,
        {
          model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的CRM询盘分析助手，请根据询盘内容进行分析并返回JSON格式的结果。',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          temperature: 0.7,
          max_tokens: 1000,
        },
        {
          headers: {
            'Authorization': `Bearer ${config.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const content = response.data.choices[0].message.content;
      return this.parseAiResponse(content);
    } catch (error: any) {
      logError('DeepSeek API call failed', error);
      throw new AppError(`DeepSeek分析失败: ${error.message}`, 500);
    }
  }

  /**
   * 调用Gemini API
   */
  private static async callGemini(prompt: string, model: string): Promise<AiAnalysisResult> {
    const config = this.aiConfig.gemini;
    
    if (!config.apiKey) {
      throw new AppError('Gemini API密钥未配置', 500);
    }

    try {
      const response = await axios.post(
        `${config.baseURL}/models/${model}:generateContent?key=${config.apiKey}`,
        {
          contents: [
            {
              parts: [
                {
                  text: `你是一个专业的CRM询盘分析助手，请根据询盘内容进行分析并返回JSON格式的结果。\n\n${prompt}`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1000,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        }
      );

      const content = response.data.candidates[0].content.parts[0].text;
      return this.parseAiResponse(content);
    } catch (error: any) {
      logError('Gemini API call failed', error);
      throw new AppError(`Gemini分析失败: ${error.message}`, 500);
    }
  }

  /**
   * 生成分析提示词
   */
  private static generatePrompt(analysisType: AnalysisType, inquiry: any): string {
    const baseInfo = `
询盘标题: ${inquiry.title}
询盘内容: ${inquiry.content}
客户姓名: ${inquiry.customerName}
客户类型: ${inquiry.customerType}
来源渠道: ${inquiry.sourceChannel}
预估价值: ${inquiry.estimatedValue || '未知'}
`;

    switch (analysisType) {
      case 'content_analysis':
        return `${baseInfo}

请分析这个询盘的内容，包括：
1. 客户的具体需求
2. 产品或服务类型
3. 技术要求
4. 预算范围
5. 时间要求

请以JSON格式返回分析结果，包含confidence（置信度0-1）、summary（总结）、details（详细分析）字段。`;

      case 'intent_analysis':
        return `${baseInfo}

请分析客户的购买意向，包括：
1. 购买意向强度（高/中/低）
2. 决策阶段（了解/比较/决策/购买）
3. 关键关注点
4. 潜在异议

请以JSON格式返回分析结果，包含confidence、summary、details、intent字段。`;

      case 'sentiment_analysis':
        return `${baseInfo}

请分析客户的情感倾向，包括：
1. 整体情感（积极/消极/中性）
2. 紧急程度
3. 满意度指标
4. 沟通风格

请以JSON格式返回分析结果，包含confidence、summary、details、sentiment字段。`;

      case 'recommendation':
        return `${baseInfo}

请基于询盘内容提供处理建议，包括：
1. 优先级建议（低/中/高/紧急）
2. 跟进策略
3. 报价建议
4. 注意事项

请以JSON格式返回分析结果，包含confidence、summary、details、recommendations、priority字段。`;

      default:
        throw new AppError(`不支持的分析类型: ${analysisType}`, 400);
    }
  }

  /**
   * 解析AI响应
   */
  private static parseAiResponse(content: string): AiAnalysisResult {
    try {
      // 尝试提取JSON内容
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          confidence: parsed.confidence || 0.8,
          summary: parsed.summary || '分析完成',
          details: parsed.details || {},
          recommendations: parsed.recommendations,
          sentiment: parsed.sentiment,
          intent: parsed.intent,
          priority: parsed.priority,
        };
      } else {
        // 如果没有找到JSON，返回默认结果
        return {
          confidence: 0.6,
          summary: content.substring(0, 200),
          details: { raw_response: content },
        };
      }
    } catch (error) {
      logError('Failed to parse AI response', error as Error, { content });
      return {
        confidence: 0.5,
        summary: '解析失败，请查看原始响应',
        details: { raw_response: content, parse_error: (error as Error).message },
      };
    }
  }

  /**
   * 获取分析历史
   */
  static async getAnalysisHistory(
    inquiryId: number,
    analysisType?: AnalysisType,
    aiProvider?: AiProvider
  ): Promise<AiAnalysisRecord[]> {
    const where: Prisma.AiAnalysisRecordWhereInput = { inquiryId };
    
    if (analysisType) {
      where.analysisType = analysisType;
    }
    
    if (aiProvider) {
      where.aiProvider = aiProvider;
    }

    return prisma.aiAnalysisRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
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
   * 批量分析
   */
  static async batchAnalysis(
    inquiryIds: number[],
    analysisType: AnalysisType,
    aiProvider: AiProvider,
    createdBy: number
  ): Promise<void> {
    // 异步处理批量分析
    Promise.all(
      inquiryIds.map(inquiryId =>
        this.performAnalysis({
          inquiryId,
          analysisType,
          aiProvider,
          createdBy,
        }).catch(error => {
          logError(`Batch analysis failed for inquiry ${inquiryId}`, error);
        })
      )
    );

    logInfo(`Batch analysis started`, {
      inquiryCount: inquiryIds.length,
      analysisType,
      aiProvider,
      createdBy,
    });
  }

  /**
   * 获取分析统计
   */
  static async getAnalysisStatistics(
    startDate?: Date,
    endDate?: Date,
    aiProvider?: AiProvider
  ): Promise<{
    totalAnalyses: number;
    successRate: number;
    averageProcessingTime: number;
    totalCost: number;
    providerStats: any[];
  }> {
    const where: Prisma.AiAnalysisRecordWhereInput = {};
    
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }
    
    if (aiProvider) {
      where.aiProvider = aiProvider;
    }

    const [total, completed, avgTime, providerStats] = await Promise.all([
      prisma.aiAnalysisRecord.count({ where }),
      prisma.aiAnalysisRecord.count({
        where: { ...where, status: AnalysisStatus.completed },
      }),
      prisma.aiAnalysisRecord.aggregate({
        where: { ...where, status: AnalysisStatus.completed },
        _avg: { processingTimeMs: true },
      }),
      prisma.aiAnalysisRecord.groupBy({
        by: ['aiProvider', 'status'],
        where,
        _count: true,
      }),
    ]);

    return {
      totalAnalyses: total,
      successRate: total > 0 ? completed / total : 0,
      averageProcessingTime: avgTime._avg.processingTimeMs || 0,
      totalCost: 0, // TODO: 实现成本计算
      providerStats,
    };
  }

  /**
   * 测试AI连接
   */
  static async testConnection(
    aiProvider: AiProvider,
    apiKey?: string
  ): Promise<{ connected: boolean; latency: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const testPrompt = '请回复"连接测试成功"';
      
      // 临时使用提供的API密钥
      if (apiKey) {
        const originalKey = this.aiConfig[aiProvider].apiKey;
        this.aiConfig[aiProvider].apiKey = apiKey;
        
        try {
          await this.callAiProvider(aiProvider, 'content_analysis', {
            title: '测试',
            content: testPrompt,
            customerName: '测试客户',
            customerType: 'individual',
            sourceChannel: 'test',
          }, this.aiConfig[aiProvider].model);
          
          return {
            connected: true,
            latency: Date.now() - startTime,
          };
        } finally {
          this.aiConfig[aiProvider].apiKey = originalKey;
        }
      } else {
        await this.callAiProvider(aiProvider, 'content_analysis', {
          title: '测试',
          content: testPrompt,
          customerName: '测试客户',
          customerType: 'individual',
          sourceChannel: 'test',
        }, this.aiConfig[aiProvider].model);
        
        return {
          connected: true,
          latency: Date.now() - startTime,
        };
      }
    } catch (error) {
      return {
        connected: false,
        latency: Date.now() - startTime,
        error: (error as Error).message,
      };
    }
  }
}
