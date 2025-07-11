import { CompareOutlined, PlayCircleOutlined, LoadingOutlined } from '@ant-design/icons';
import { PageContainer, ProFormSelect } from '@ant-design/pro-components';
import { Card, Button, Space, message, Row, Col, Descriptions, Progress, Tag, Alert, Spin } from 'antd';
import { useState } from 'react';
import { getInquiryList } from '@/services/inquiry';
import { performAIAnalysis } from '@/services/ai';

const AICompare: React.FC = () => {
  const [selectedInquiry, setSelectedInquiry] = useState<API.Inquiry | null>(null);
  const [analysisType, setAnalysisType] = useState<string>('content_analysis');
  const [comparing, setComparing] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<any[]>([]);
  const [inquiryOptions, setInquiryOptions] = useState<any[]>([]);

  // AI提供商配置
  const aiProviders = [
    { key: 'openai', name: 'OpenAI GPT', color: '#10a37f' },
    { key: 'deepseek', name: 'DeepSeek', color: '#1890ff' },
    { key: 'gemini', name: 'Google Gemini', color: '#4285f4' },
  ];

  // 分析类型选项
  const analysisTypeOptions = [
    { label: '内容分析', value: 'content_analysis' },
    { label: '意图分析', value: 'intent_analysis' },
    { label: '情感分析', value: 'sentiment_analysis' },
    { label: '建议分析', value: 'recommendation' },
  ];

  // 获取询盘选项
  const fetchInquiryOptions = async (search?: string) => {
    try {
      const response = await getInquiryList({
        page: 1,
        pageSize: 50,
        search,
      });

      if (response.success) {
        const options = response.data.inquiries.map((inquiry: API.Inquiry) => ({
          label: `${inquiry.inquiryNo} - ${inquiry.title}`,
          value: inquiry.id,
          inquiry,
        }));
        setInquiryOptions(options);
        return options;
      }
      return [];
    } catch (error) {
      return [];
    }
  };

  // 执行多模型对比分析
  const handleCompareAnalysis = async () => {
    if (!selectedInquiry) {
      message.error('请先选择要分析的询盘');
      return;
    }

    setComparing(true);
    setComparisonResults([]);

    try {
      const promises = aiProviders.map(async (provider) => {
        try {
          const response = await performAIAnalysis({
            inquiryId: selectedInquiry.id,
            analysisType,
            aiProvider: provider.key,
          });

          return {
            provider: provider.key,
            providerName: provider.name,
            providerColor: provider.color,
            success: response.success,
            data: response.success ? response.data : null,
            error: response.success ? null : response.message,
          };
        } catch (error: any) {
          return {
            provider: provider.key,
            providerName: provider.name,
            providerColor: provider.color,
            success: false,
            data: null,
            error: error.message,
          };
        }
      });

      const results = await Promise.all(promises);
      setComparisonResults(results);
      
      const successCount = results.filter(r => r.success).length;
      message.success(`对比分析完成，成功 ${successCount}/${results.length} 个模型`);
    } catch (error: any) {
      message.error(error.message || '对比分析失败');
    } finally {
      setComparing(false);
    }
  };

  // 渲染单个分析结果
  const renderAnalysisResult = (result: any) => {
    const { providerName, providerColor, success, data, error } = result;

    if (!success) {
      return (
        <Card 
          title={
            <Space>
              <div style={{ width: 12, height: 12, backgroundColor: providerColor, borderRadius: '50%' }} />
              {providerName}
            </Space>
          }
          style={{ height: '100%' }}
        >
          <Alert message="分析失败" description={error} type="error" />
        </Card>
      );
    }

    const { outputData, confidenceScore } = data;

    return (
      <Card 
        title={
          <Space>
            <div style={{ width: 12, height: 12, backgroundColor: providerColor, borderRadius: '50%' }} />
            {providerName}
          </Space>
        }
        style={{ height: '100%' }}
      >
        <Descriptions size="small" column={1} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="置信度">
            <Progress 
              percent={Math.round(confidenceScore * 100)} 
              size="small"
              strokeColor={providerColor}
            />
          </Descriptions.Item>
        </Descriptions>

        {outputData?.summary && (
          <div style={{ marginBottom: 12 }}>
            <strong>分析摘要：</strong>
            <p style={{ fontSize: '12px', margin: '4px 0' }}>{outputData.summary}</p>
          </div>
        )}

        {outputData?.sentiment && (
          <div style={{ marginBottom: 12 }}>
            <strong>情感倾向：</strong>
            <Tag color={
              outputData.sentiment === 'positive' ? 'green' :
              outputData.sentiment === 'negative' ? 'red' : 'blue'
            } style={{ marginLeft: 8 }}>
              {outputData.sentiment === 'positive' ? '积极' :
               outputData.sentiment === 'negative' ? '消极' : '中性'}
            </Tag>
          </div>
        )}

        {outputData?.intent && (
          <div style={{ marginBottom: 12 }}>
            <strong>客户意图：</strong>
            <p style={{ fontSize: '12px', margin: '4px 0' }}>{outputData.intent}</p>
          </div>
        )}

        {outputData?.priority && (
          <div style={{ marginBottom: 12 }}>
            <strong>优先级：</strong>
            <Tag color={
              outputData.priority === 'urgent' ? 'red' :
              outputData.priority === 'high' ? 'orange' :
              outputData.priority === 'medium' ? 'blue' : 'default'
            } style={{ marginLeft: 8 }}>
              {outputData.priority === 'urgent' ? '紧急' :
               outputData.priority === 'high' ? '高' :
               outputData.priority === 'medium' ? '中' : '低'}
            </Tag>
          </div>
        )}

        {outputData?.recommendations && outputData.recommendations.length > 0 && (
          <div>
            <strong>处理建议：</strong>
            <ul style={{ fontSize: '12px', margin: '4px 0', paddingLeft: 16 }}>
              {outputData.recommendations.slice(0, 3).map((rec: string, index: number) => (
                <li key={index}>{rec}</li>
              ))}
              {outputData.recommendations.length > 3 && (
                <li>... 还有 {outputData.recommendations.length - 3} 条建议</li>
              )}
            </ul>
          </div>
        )}
      </Card>
    );
  };

  // 渲染对比总结
  const renderComparisonSummary = () => {
    if (comparisonResults.length === 0) return null;

    const successResults = comparisonResults.filter(r => r.success);
    const avgConfidence = successResults.length > 0 
      ? successResults.reduce((sum, r) => sum + r.data.confidenceScore, 0) / successResults.length 
      : 0;

    // 统计情感分析结果
    const sentiments = successResults
      .map(r => r.data.outputData?.sentiment)
      .filter(Boolean);
    const sentimentCounts = sentiments.reduce((acc: any, sentiment) => {
      acc[sentiment] = (acc[sentiment] || 0) + 1;
      return acc;
    }, {});

    const mostCommonSentiment = Object.keys(sentimentCounts).reduce((a, b) => 
      sentimentCounts[a] > sentimentCounts[b] ? a : b, '');

    return (
      <Card title="对比分析总结" style={{ marginTop: 16 }}>
        <Row gutter={16}>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#1890ff' }}>
                {successResults.length}/{comparisonResults.length}
              </div>
              <div style={{ color: '#666' }}>成功率</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#52c41a' }}>
                {Math.round(avgConfidence * 100)}%
              </div>
              <div style={{ color: '#666' }}>平均置信度</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold' }}>
                {mostCommonSentiment && (
                  <Tag color={
                    mostCommonSentiment === 'positive' ? 'green' :
                    mostCommonSentiment === 'negative' ? 'red' : 'blue'
                  }>
                    {mostCommonSentiment === 'positive' ? '积极' :
                     mostCommonSentiment === 'negative' ? '消极' : '中性'}
                  </Tag>
                )}
              </div>
              <div style={{ color: '#666' }}>主要情感倾向</div>
            </div>
          </Col>
          <Col span={6}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#fa8c16' }}>
                {sentiments.length}
              </div>
              <div style={{ color: '#666' }}>一致性指标</div>
            </div>
          </Col>
        </Row>
      </Card>
    );
  };

  return (
    <PageContainer>
      <Card title="AI模型对比分析" style={{ marginBottom: 16 }}>
        <Alert
          message="多模型对比分析"
          description="选择询盘和分析类型，系统将同时使用多个AI模型进行分析，并对比不同模型的分析结果，帮助您获得更全面的洞察。"
          type="info"
          style={{ marginBottom: 16 }}
        />

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={12}>
            <ProFormSelect
              label="选择询盘"
              placeholder="请搜索并选择要分析的询盘"
              showSearch
              request={fetchInquiryOptions}
              fieldProps={{
                onSelect: (value: any, option: any) => {
                  setSelectedInquiry(option.inquiry);
                },
                filterOption: false,
                onSearch: fetchInquiryOptions,
              }}
            />
          </Col>
          <Col span={8}>
            <ProFormSelect
              label="分析类型"
              options={analysisTypeOptions}
              fieldProps={{
                value: analysisType,
                onChange: setAnalysisType,
              }}
            />
          </Col>
          <Col span={4}>
            <div style={{ paddingTop: 30 }}>
              <Button
                type="primary"
                icon={comparing ? <LoadingOutlined /> : <CompareOutlined />}
                loading={comparing}
                onClick={handleCompareAnalysis}
                disabled={!selectedInquiry}
                block
              >
                开始对比
              </Button>
            </div>
          </Col>
        </Row>

        {selectedInquiry && (
          <Card title="询盘信息" size="small">
            <Descriptions size="small" column={2}>
              <Descriptions.Item label="询盘编号">{selectedInquiry.inquiryNo}</Descriptions.Item>
              <Descriptions.Item label="客户名称">{selectedInquiry.customerName}</Descriptions.Item>
              <Descriptions.Item label="询盘标题" span={2}>{selectedInquiry.title}</Descriptions.Item>
              <Descriptions.Item label="询盘内容" span={2}>
                <div style={{ maxHeight: 100, overflow: 'auto' }}>
                  {selectedInquiry.content}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </Card>

      {comparing && (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>正在进行多模型分析对比，请稍候...</div>
          </div>
        </Card>
      )}

      {comparisonResults.length > 0 && !comparing && (
        <>
          <Row gutter={16}>
            {comparisonResults.map((result, index) => (
              <Col span={8} key={result.provider}>
                {renderAnalysisResult(result)}
              </Col>
            ))}
          </Row>
          {renderComparisonSummary()}
        </>
      )}
    </PageContainer>
  );
};

export default AICompare;
