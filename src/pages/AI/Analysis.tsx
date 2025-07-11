import { PlayCircleOutlined, HistoryOutlined, CompareOutlined, LoadingOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable, ModalForm, ProFormSelect, ProFormTextArea } from '@ant-design/pro-components';
import { Button, Card, Space, message, Modal, Tag, Descriptions, Spin, Alert, Progress } from 'antd';
import { useRef, useState } from 'react';
import { getInquiryList } from '@/services/inquiry';
import { performAIAnalysis, getAIAnalysisHistory } from '@/services/ai';

const AIAnalysis: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [analysisModalVisible, setAnalysisModalVisible] = useState(false);
  const [resultModalVisible, setResultModalVisible] = useState(false);
  const [currentInquiry, setCurrentInquiry] = useState<API.Inquiry | null>(null);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  // AI提供商选项
  const aiProviderOptions = [
    { label: 'OpenAI GPT', value: 'openai' },
    { label: 'DeepSeek', value: 'deepseek' },
    { label: 'Google Gemini', value: 'gemini' },
  ];

  // 分析类型选项
  const analysisTypeOptions = [
    { label: '内容分析', value: 'content_analysis' },
    { label: '意图分析', value: 'intent_analysis' },
    { label: '情感分析', value: 'sentiment_analysis' },
    { label: '建议分析', value: 'recommendation' },
  ];

  // 表格列定义
  const columns: ProColumns<API.Inquiry>[] = [
    {
      title: '询盘编号',
      dataIndex: 'inquiryNo',
      width: 150,
      fixed: 'left',
      copyable: true,
    },
    {
      title: '询盘标题',
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
    },
    {
      title: '客户名称',
      dataIndex: 'customerName',
      width: 150,
    },
    {
      title: '客户类型',
      dataIndex: 'customerType',
      width: 120,
      valueEnum: {
        individual: { text: '个人' },
        enterprise: { text: '企业' },
        government: { text: '政府' },
        ngo: { text: '非营利组织' },
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueEnum: {
        new: { text: '新询盘', status: 'Default' },
        contacted: { text: '已联系', status: 'Processing' },
        quoted: { text: '已报价', status: 'Warning' },
        negotiating: { text: '谈判中', status: 'Processing' },
        won: { text: '已成交', status: 'Success' },
        lost: { text: '已失败', status: 'Error' },
        closed: { text: '已关闭', status: 'Default' },
      },
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 100,
      valueEnum: {
        low: { text: '低', status: 'Default' },
        medium: { text: '中', status: 'Processing' },
        high: { text: '高', status: 'Warning' },
        urgent: { text: '紧急', status: 'Error' },
      },
    },
    {
      title: '预估价值',
      dataIndex: 'estimatedValue',
      width: 120,
      valueType: 'money',
      hideInSearch: true,
    },
    {
      title: '创建时间',
      dataIndex: 'createdAt',
      width: 160,
      valueType: 'dateTime',
      hideInSearch: true,
      sorter: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 200,
      fixed: 'right',
      render: (text, record) => [
        <Button
          key="analyze"
          type="primary"
          size="small"
          icon={<PlayCircleOutlined />}
          onClick={() => handleStartAnalysis(record)}
        >
          AI分析
        </Button>,
        <Button
          key="history"
          size="small"
          icon={<HistoryOutlined />}
          onClick={() => handleViewHistory(record)}
        >
          历史记录
        </Button>,
      ],
    },
  ];

  // 获取询盘列表
  const fetchInquiries = async (params: any) => {
    try {
      const response = await getInquiryList({
        page: params.current,
        pageSize: params.pageSize,
        search: params.title || params.customerName,
        status: params.status,
        priority: params.priority,
        customerType: params.customerType,
        startDate: params.createdAt?.[0],
        endDate: params.createdAt?.[1],
      });

      if (response.success) {
        return {
          data: response.data.inquiries,
          success: true,
          total: response.data.total,
        };
      } else {
        message.error(response.message || '获取询盘列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error: any) {
      message.error(error.message || '获取询盘列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 开始AI分析
  const handleStartAnalysis = (inquiry: API.Inquiry) => {
    setCurrentInquiry(inquiry);
    setAnalysisModalVisible(true);
  };

  // 执行AI分析
  const handlePerformAnalysis = async (values: any) => {
    if (!currentInquiry) return false;

    try {
      setAnalyzing(true);
      const response = await performAIAnalysis({
        inquiryId: currentInquiry.id,
        analysisType: values.analysisType,
        aiProvider: values.aiProvider,
      });

      if (response.success) {
        setAnalysisResult(response.data);
        setAnalysisModalVisible(false);
        setResultModalVisible(true);
        message.success('AI分析完成');
        return true;
      } else {
        message.error(response.message || 'AI分析失败');
        return false;
      }
    } catch (error: any) {
      message.error(error.message || 'AI分析失败');
      return false;
    } finally {
      setAnalyzing(false);
    }
  };

  // 查看分析历史
  const handleViewHistory = async (inquiry: API.Inquiry) => {
    try {
      const response = await getAIAnalysisHistory(inquiry.id);
      if (response.success) {
        Modal.info({
          title: `${inquiry.title} - AI分析历史`,
          width: 800,
          content: (
            <div style={{ maxHeight: 400, overflow: 'auto' }}>
              {response.data.length === 0 ? (
                <Alert message="暂无分析历史" type="info" />
              ) : (
                response.data.map((record: any, index: number) => (
                  <Card key={record.id} size="small" style={{ marginBottom: 8 }}>
                    <Descriptions size="small" column={2}>
                      <Descriptions.Item label="分析类型">
                        {analysisTypeOptions.find(opt => opt.value === record.analysisType)?.label}
                      </Descriptions.Item>
                      <Descriptions.Item label="AI提供商">
                        {aiProviderOptions.find(opt => opt.value === record.aiProvider)?.label}
                      </Descriptions.Item>
                      <Descriptions.Item label="置信度">
                        <Progress percent={Math.round(record.confidenceScore * 100)} size="small" />
                      </Descriptions.Item>
                      <Descriptions.Item label="分析时间">
                        {new Date(record.createdAt).toLocaleString()}
                      </Descriptions.Item>
                      <Descriptions.Item label="分析结果" span={2}>
                        <div style={{ maxHeight: 100, overflow: 'auto' }}>
                          {record.outputData?.summary || '无结果'}
                        </div>
                      </Descriptions.Item>
                    </Descriptions>
                  </Card>
                ))
              )}
            </div>
          ),
        });
      }
    } catch (error: any) {
      message.error(error.message || '获取分析历史失败');
    }
  };

  // 渲染分析结果
  const renderAnalysisResult = () => {
    if (!analysisResult) return null;

    const { outputData, confidenceScore, aiProvider, analysisType } = analysisResult;

    return (
      <div>
        <Descriptions bordered column={2} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="AI提供商">
            {aiProviderOptions.find(opt => opt.value === aiProvider)?.label}
          </Descriptions.Item>
          <Descriptions.Item label="分析类型">
            {analysisTypeOptions.find(opt => opt.value === analysisType)?.label}
          </Descriptions.Item>
          <Descriptions.Item label="置信度" span={2}>
            <Progress percent={Math.round(confidenceScore * 100)} />
          </Descriptions.Item>
        </Descriptions>

        <Card title="分析摘要" style={{ marginBottom: 16 }}>
          <p>{outputData?.summary || '无摘要'}</p>
        </Card>

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
          <Card title="处理建议">
            <ul>
              {outputData.recommendations.map((rec: string, index: number) => (
                <li key={index}>{rec}</li>
              ))}
            </ul>
          </Card>
        )}

        {outputData?.details && (
          <Card title="详细分析" style={{ marginTop: 16 }}>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: '12px' }}>
              {JSON.stringify(outputData.details, null, 2)}
            </pre>
          </Card>
        )}
      </div>
    );
  };

  return (
    <PageContainer>
      <ProTable<API.Inquiry>
        headerTitle="AI智能分析"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            key="compare"
            icon={<CompareOutlined />}
            onClick={() => message.info('多模型对比功能开发中')}
          >
            模型对比
          </Button>,
        ]}
        request={fetchInquiries}
        columns={columns}
        scroll={{ x: 1500 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      {/* AI分析配置弹窗 */}
      <ModalForm
        title={`AI分析 - ${currentInquiry?.title}`}
        width={600}
        open={analysisModalVisible}
        onOpenChange={setAnalysisModalVisible}
        onFinish={handlePerformAnalysis}
        modalProps={{
          destroyOnClose: true,
          confirmLoading: analyzing,
        }}
        submitter={{
          submitButtonProps: {
            loading: analyzing,
            icon: analyzing ? <LoadingOutlined /> : <PlayCircleOutlined />,
          },
        }}
      >
        <Alert
          message="AI分析说明"
          description="选择AI提供商和分析类型，系统将对询盘内容进行智能分析，提供客户意图、情感倾向和处理建议。"
          type="info"
          style={{ marginBottom: 16 }}
        />

        <ProFormSelect
          name="aiProvider"
          label="AI提供商"
          options={aiProviderOptions}
          rules={[{ required: true, message: '请选择AI提供商' }]}
          placeholder="请选择AI提供商"
          initialValue="openai"
        />

        <ProFormSelect
          name="analysisType"
          label="分析类型"
          options={analysisTypeOptions}
          rules={[{ required: true, message: '请选择分析类型' }]}
          placeholder="请选择分析类型"
          initialValue="content_analysis"
        />

        {currentInquiry && (
          <Card title="询盘信息预览" size="small" style={{ marginTop: 16 }}>
            <Descriptions size="small" column={1}>
              <Descriptions.Item label="标题">{currentInquiry.title}</Descriptions.Item>
              <Descriptions.Item label="客户">{currentInquiry.customerName}</Descriptions.Item>
              <Descriptions.Item label="内容">
                <div style={{ maxHeight: 100, overflow: 'auto' }}>
                  {currentInquiry.content}
                </div>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        )}
      </ModalForm>

      {/* 分析结果展示弹窗 */}
      <Modal
        title="AI分析结果"
        width={800}
        open={resultModalVisible}
        onCancel={() => setResultModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setResultModalVisible(false)}>
            关闭
          </Button>,
        ]}
      >
        {renderAnalysisResult()}
      </Modal>
    </PageContainer>
  );
};

export default AIAnalysis;
