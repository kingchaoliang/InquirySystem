import { PlusOutlined, SettingOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable } from '@ant-design/pro-components';
import { Button, Tag, Space, Tooltip, message, Modal } from 'antd';
import { useRef, useState } from 'react';
import { history } from '@umijs/max';
import { getInquiryList, deleteInquiry, batchUpdateInquiries } from '@/services/inquiry';

// 询盘数据类型定义
type InquiryItem = {
  id: number;
  inquiryNo: string;
  title: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  sourceChannel: string;
  status: string;
  priority: string;
  assignedTo?: string;
  estimatedValue?: number;
  currency?: string;
  createdAt: string;
  updatedAt: string;
};

// 状态标签颜色映射
const statusColorMap = {
  new: 'blue',
  contacted: 'orange',
  quoted: 'purple',
  negotiating: 'gold',
  won: 'green',
  lost: 'red',
  closed: 'default',
};

// 优先级标签颜色映射
const priorityColorMap = {
  low: 'default',
  medium: 'blue',
  high: 'orange',
  urgent: 'red',
};

const InquiryList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [selectedRows, setSelectedRows] = useState<InquiryItem[]>([]);

  // 表格列定义
  const columns: ProColumns<InquiryItem>[] = [
    {
      title: '询盘编号',
      dataIndex: 'inquiryNo',
      width: 120,
      fixed: 'left',
      render: (text, record) => (
        <a onClick={() => history.push(`/inquiry/detail/${record.id}`)}>
          {text}
        </a>
      ),
    },
    {
      title: '询盘标题',
      dataIndex: 'title',
      width: 200,
      ellipsis: true,
      tooltip: true,
    },
    {
      title: '客户姓名',
      dataIndex: 'customerName',
      width: 120,
    },
    {
      title: '客户邮箱',
      dataIndex: 'customerEmail',
      width: 180,
      hideInSearch: true,
    },
    {
      title: '客户电话',
      dataIndex: 'customerPhone',
      width: 140,
      hideInSearch: true,
    },
    {
      title: '来源渠道',
      dataIndex: 'sourceChannel',
      width: 120,
      valueType: 'select',
      valueEnum: {
        website: { text: '官网' },
        email: { text: '邮件' },
        phone: { text: '电话' },
        exhibition: { text: '展会' },
        referral: { text: '推荐' },
        other: { text: '其他' },
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueType: 'select',
      valueEnum: {
        new: { text: '新询盘' },
        contacted: { text: '已联系' },
        quoted: { text: '已报价' },
        negotiating: { text: '谈判中' },
        won: { text: '已成交' },
        lost: { text: '已失败' },
        closed: { text: '已关闭' },
      },
      render: (_, record) => (
        <Tag color={statusColorMap[record.status as keyof typeof statusColorMap]}>
          {columns.find(col => col.dataIndex === 'status')?.valueEnum?.[record.status]?.text}
        </Tag>
      ),
    },
    {
      title: '优先级',
      dataIndex: 'priority',
      width: 100,
      valueType: 'select',
      valueEnum: {
        low: { text: '低' },
        medium: { text: '中' },
        high: { text: '高' },
        urgent: { text: '紧急' },
      },
      render: (_, record) => (
        <Tag color={priorityColorMap[record.priority as keyof typeof priorityColorMap]}>
          {columns.find(col => col.dataIndex === 'priority')?.valueEnum?.[record.priority]?.text}
        </Tag>
      ),
    },
    {
      title: '分配给',
      dataIndex: 'assignedTo',
      width: 120,
      hideInSearch: true,
    },
    {
      title: '预估价值',
      dataIndex: 'estimatedValue',
      width: 120,
      hideInSearch: true,
      render: (_, record) => {
        if (record.estimatedValue) {
          return `${record.currency || 'USD'} ${record.estimatedValue.toLocaleString()}`;
        }
        return '-';
      },
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
      title: '更新时间',
      dataIndex: 'updatedAt',
      width: 160,
      valueType: 'dateTime',
      hideInSearch: true,
      sorter: true,
    },
    {
      title: '操作',
      valueType: 'option',
      width: 120,
      fixed: 'right',
      render: (text, record) => [
        <a key="view" onClick={() => history.push(`/inquiry/detail/${record.id}`)}>
          查看
        </a>,
        <a key="edit" onClick={() => history.push(`/inquiry/detail/${record.id}?mode=edit`)}>
          编辑
        </a>,
        <a
          key="delete"
          style={{ color: 'red' }}
          onClick={() => handleDelete(record)}
        >
          删除
        </a>,
      ],
    },
  ];

  // 删除询盘
  const handleDelete = (record: InquiryItem) => {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除询盘"${record.title}"吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await deleteInquiry(record.id);
          if (response.success) {
            message.success('删除成功');
            actionRef.current?.reload();
          } else {
            message.error(response.message || '删除失败');
          }
        } catch (error: any) {
          message.error(error.message || '删除失败');
        }
      },
    });
  };

  // 批量删除
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请选择要删除的询盘');
      return;
    }

    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个询盘吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          const response = await batchUpdateInquiries({
            ids: selectedRowKeys as number[],
            action: 'delete',
          });
          if (response.success) {
            message.success('批量删除成功');
            setSelectedRowKeys([]);
            setSelectedRows([]);
            actionRef.current?.reload();
          } else {
            message.error(response.message || '批量删除失败');
          }
        } catch (error: any) {
          message.error(error.message || '批量删除失败');
        }
      },
    });
  };

  // 获取询盘列表
  const fetchInquiryList = async (params: any) => {
    try {
      const response = await getInquiryList({
        page: params.current,
        pageSize: params.pageSize,
        search: params.title || params.customerName || params.customerEmail,
        status: params.status,
        priority: params.priority,
        sourceChannel: params.sourceChannel,
        assignedTo: params.assignedTo,
        departmentId: params.departmentId,
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

  return (
    <PageContainer>
      <ProTable<InquiryItem>
        headerTitle="询盘列表"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => history.push('/inquiry/create')}
          >
            <PlusOutlined /> 新建询盘
          </Button>,
          <Tooltip title="自定义表头" key="setting">
            <Button
              icon={<SettingOutlined />}
              onClick={() => {
                // TODO: 打开自定义表头配置弹窗
                console.log('打开自定义表头配置');
              }}
            />
          </Tooltip>,
        ]}
        request={fetchInquiryList}
        columns={columns}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys, rows) => {
            setSelectedRowKeys(keys);
            setSelectedRows(rows);
          },
        }}
        tableAlertRender={({ selectedRowKeys, selectedRows, onCleanSelected }) => (
          <Space size={24}>
            <span>
              已选择 {selectedRowKeys.length} 项
              <a style={{ marginLeft: 8 }} onClick={onCleanSelected}>
                取消选择
              </a>
            </span>
          </Space>
        )}
        tableAlertOptionRender={({ selectedRowKeys, selectedRows, onCleanSelected }) => {
          return (
            <Space size={16}>
              <a onClick={() => console.log('批量分配')}>批量分配</a>
              <a onClick={() => console.log('批量更新状态')}>批量更新状态</a>
              <a onClick={handleBatchDelete} style={{ color: 'red' }}>批量删除</a>
              <a onClick={() => console.log('批量导出')}>批量导出</a>
            </Space>
          );
        }}
        scroll={{ x: 1500 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />
    </PageContainer>
  );
};

export default InquiryList;
