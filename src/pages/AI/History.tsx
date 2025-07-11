import { EyeOutlined, BarChartOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Tag, Modal, Card, Descriptions, Progress, Space } from 'antd';
import { useRef, useState } from 'react';
import { getAIAnalysisHistory } from '@/services/ai';

const AIHistory: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<any>(null);

  // AI提供商映射
  const aiProviderMap = {
    openai: 'OpenAI GPT',
    deepseek: 'DeepSeek',
    gemini: 'Google Gemini',
  };

  // 分析类型映射
  const analysisTypeMap = {
    content_analysis: '内容分析',
    intent_analysis: '意图分析',
    sentiment_analysis: '情感分析',
    recommendation: '建议分析',
  };

  // 状态颜色映射
  const statusColorMap = {
    pending: 'processing',
    completed: 'success',
    failed: 'error',
  };

  // 表格列定义
  const columns: ProColumns<any>[] = [
    {
      title: '询盘编号',
      dataIndex: ['inquiry', 'inquiryNo'],
      width: 150,
      copyable: true,
    },
    {
      title: '询盘标题',
      dataIndex: ['inquiry', 'title'],
      width: 200,
      ellipsis: true,
    },
    {
      title: 'AI提供商',
      dataIndex: 'aiProvider',
      width: 120,
      render: (provider) => aiProviderMap[provider as keyof typeof aiProviderMap] || provider,
      valueEnum: {
        openai: { text: 'OpenAI GPT' },
        deepseek: { text: 'DeepSeek' },
        gemini: { text: 'Google Gemini' },
      },
    },
    {
      title: '分析类型',
      dataIndex: 'analysisType',
      width: 120,
      render: (type) => analysisTypeMap[type as keyof typeof analysisTypeMap] || type,
      valueEnum: {
        content_analysis: { text: '内容分析' },
        intent_analysis: { text: '意图分析' },
        sentiment_analysis: { text: '情感分析' },
        recommendation: { text: '建议分析' },
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status) => (
        <Tag color={statusColorMap[status as keyof typeof statusColorMap]}>
          {status === 'pending' ? '处理中' : 
           status === 'completed' ? '已完成' : '失败'}
        </Tag>
      ),
      valueEnum: {
        pending: { text: '处理中', status: 'Processing' },
        completed: { text: '已完成', status: 'Success' },
        failed: { text: '失败', status: 'Error' },
      },
    },
    {
      title: '置信度',
      dataIndex: 'confidenceScore',
      width: 120,
      hideInSearch: true,
      render: (score) => score ? (
        <Progress 
          percent={Math.round(score * 100)} 
          size="small" 
          status={score > 0.8 ? 'success' : score > 0.6 ? 'normal' : 'exception'}
        />
      ) : '-',
    },
    {
      title: '处理时间',
      dataIndex: 'processingTimeMs',
      width: 100,
      hideInSearch: true,
      render: (time) => time ? `${time}ms` : '-',
    },
    {
      title: '创建人',
      dataIndex: ['creator', 'fullName'],
      width: 100,
      hideInSearch: true,
    },
    {
      title: '分析时间',
      dataIndex: 'createdAt',
      width: 160,
      valueType: 'dateTime',
      sorter: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      render: (text, record) => [
        <Button
          key="view"
          type="link"
          size="small"
          icon={<EyeOutlined />}
          onClick={() => handleViewDetail(record)}
        >
          查看详情
        </Button>,
      ],
    },
  ];

  // 获取分析历史列表
  const fetchAnalysisHistory = async (params: any) => {
    try {
      const response = await getAIAnalysisHistory(undefined, {
        page: params.current,
        pageSize: params.pageSize,
        analysisType: params.analysisType,
        aiProvider: params.aiProvider,
        status: params.status,
        startDate: params.createdAt?.[0],
        endDate: params.createdAt?.[1],
      });

      if (response.success) {
        return {
          data: response.data,
          success: true,
          total: response.data.length, // 注意：这里可能需要后端返回总数
        };
      } else {
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error) {
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 查看详情
  const handleViewDetail = (record: any) => {
    setCurrentRecord(record);
    setDetailModalVisible(true);
  };

  // 渲染分析结果详情
  const renderAnalysisDetail = () => {
    if (!currentRecord) return null;

    const { outputData, confidenceScore, aiProvider, analysisType, processingTimeMs } = currentRecord;

    return (
      <div>
        <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="AI提供商">
            {aiProviderMap[aiProvider as keyof typeof aiProviderMap]}
          </Descriptions.Item>
          <Descriptions.Item label="分析类型">
            {analysisTypeMap[analysisType as keyof typeof analysisTypeMap]}
          </Descriptions.Item>
          <Descriptions.Item label="置信度">
            <Progress percent={Math.round(confidenceScore * 100)} />
          </Descriptions.Item>
          <Descriptions.Item label="处理时间">
            {processingTimeMs}ms
          </Descriptions.Item>
          <Descriptions.Item label="分析时间" span={2}>
            {new Date(currentRecord.createdAt).toLocaleString()}
          </Descriptions.Item>
        </Descriptions>

        {outputData?.summary && (
          <Card title="分析摘要" style={{ marginBottom: 16 }}>
            <p>{outputData.summary}</p>
          </Card>
        )}

        {outputData?.sentiment && (
          <Card title="情感分析" style={{ marginBottom: 16 }}>
            <Tag color={
              outputData.sentiment === 'positive' ? 'green' :
              outputData.sentiment === 'negative' ? 'red' : 'blue'
            }>
              {outputData.sentiment === 'positive' ? '积极' :
               outputData.sentiment === 'negative' ? '消极' : '中性'}
            </Tag>
          </Card>
        )}

        {outputData?.intent && (
          <Card title="意图分析" style={{ marginBottom: 16 }}>
            <p>{outputData.intent}</p>
          </Card>
        )}

        {outputData?.priority && (
          <Card title="优先级建议" style={{ marginBottom: 16 }}>
            <Tag color={
              outputData.priority === 'urgent' ? 'red' :
              outputData.priority === 'high' ? 'orange' :
              outputData.priority === 'medium' ? 'blue' : 'default'
            }>
              {outputData.priority === 'urgent' ? '紧急' :
               outputData.priority === 'high' ? '高' :
               outputData.priority === 'medium' ? '中' : '低'}
            </Tag>
          </Card>
        )}

        {outputData?.recommendations && outputData.recommendations.length > 0 && (
          <Card title="处理建议" style={{ marginBottom: 16 }}>
            <ul>
              {outputData.recommendations.map((rec: string, index: number) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </Card>
        )}

        {outputData?.details && (
          <Card title="详细分析">
            <pre style={{ 
              whiteSpace: 'pre-wrap', 
              fontSize: '12px',
              maxHeight: '300px',
              overflow: 'auto',
              backgroundColor: '#f5f5f5',
              padding: '12px',
              borderRadius: '4px'
            }}>
              {JSON.stringify(outputData.details, null, 2)}
            </pre>
          </Card>
        )}

        {currentRecord.errorMessage && (
          <Card title="错误信息" style={{ marginTop: 16 }}>
            <p style={{ color: 'red' }}>{currentRecord.errorMessage}</p>
          </Card>
        )}
      </div>
    );
  };

  return (
    <PageContainer>
      <ProTable<any>
        headerTitle="AI分析历史"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            key="statistics"
            icon={<BarChartOutlined />}
            onClick={() => {
              // TODO: 跳转到统计页面
              window.open('/statistics', '_blank');
            }}
          >
            分析统计
          </Button>,
        ]}
        request={fetchAnalysisHistory}
        columns={columns}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      {/* 分析详情弹窗 */}
      <Modal
        title="AI分析详情"
        width={800}
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {renderAnalysisDetail()}
      </Modal>
    </PageContainer>
  );
};

export default AIHistory;
