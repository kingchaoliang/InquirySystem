import { ArrowLeftOutlined, EditOutlined, SaveOutlined } from '@ant-design/icons';
import { PageContainer, ProDescriptions, ProForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormDigit, ProFormDatePicker } from '@ant-design/pro-components';
import { Button, Card, message, Spin, Tag, Space, Divider } from 'antd';
import { useEffect, useState } from 'react';
import { history, useParams, useSearchParams } from '@umijs/max';
import { getInquiryDetail, updateInquiry, getUserList, getDepartmentTree } from '@/services/inquiry';

const InquiryDetail: React.FC = () => {
  const params = useParams();
  const [searchParams] = useSearchParams();
  const [inquiry, setInquiry] = useState<API.InquiryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [users, setUsers] = useState<API.CurrentUser[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form] = ProForm.useForm();

  const inquiryId = params.id;
  const isEditMode = searchParams.get('mode') === 'edit';

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

  // 获取询盘详情
  const fetchInquiryDetail = async () => {
    if (!inquiryId) return;

    try {
      setLoading(true);
      const response = await getInquiryDetail(Number(inquiryId));
      if (response.success) {
        setInquiry(response.data);
        // 如果是编辑模式，设置表单初始值
        if (isEditMode || editing) {
          form.setFieldsValue({
            ...response.data,
            expectedCloseDate: response.data.expectedCloseDate ? new Date(response.data.expectedCloseDate) : undefined,
          });
        }
      } else {
        message.error(response.message || '获取询盘详情失败');
      }
    } catch (error: any) {
      message.error(error.message || '获取询盘详情失败');
    } finally {
      setLoading(false);
    }
  };

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      const response = await getUserList({ pageSize: 1000 });
      if (response.success) {
        setUsers(response.data.users);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
    }
  };

  // 获取部门列表
  const fetchDepartments = async () => {
    try {
      const response = await getDepartmentTree();
      if (response.success) {
        setDepartments(response.data);
      }
    } catch (error) {
      console.error('获取部门列表失败:', error);
    }
  };

  useEffect(() => {
    fetchInquiryDetail();
    if (isEditMode) {
      setEditing(true);
      fetchUsers();
      fetchDepartments();
    }
  }, [inquiryId, isEditMode]);

  // 保存修改
  const handleSave = async (values: any) => {
    if (!inquiryId) return;

    try {
      const response = await updateInquiry(Number(inquiryId), values);
      if (response.success) {
        message.success('保存成功');
        setInquiry(response.data);
        setEditing(false);
        // 更新URL，移除编辑模式参数
        history.replace(`/inquiry/detail/${inquiryId}`);
      } else {
        message.error(response.message || '保存失败');
      }
    } catch (error: any) {
      message.error(error.message || '保存失败');
    }
  };

  // 进入编辑模式
  const handleEdit = () => {
    setEditing(true);
    if (users.length === 0) fetchUsers();
    if (departments.length === 0) fetchDepartments();
    if (inquiry) {
      form.setFieldsValue({
        ...inquiry,
        expectedCloseDate: inquiry.expectedCloseDate ? new Date(inquiry.expectedCloseDate) : undefined,
      });
    }
  };

  // 取消编辑
  const handleCancel = () => {
    setEditing(false);
    form.resetFields();
    // 更新URL，移除编辑模式参数
    history.replace(`/inquiry/detail/${inquiryId}`);
  };

  if (loading) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      </PageContainer>
    );
  }

  if (!inquiry) {
    return (
      <PageContainer>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          询盘不存在
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      header={{
        title: inquiry.title,
        onBack: () => history.goBack(),
        extra: [
          !editing && (
            <Button key="edit" type="primary" icon={<EditOutlined />} onClick={handleEdit}>
              编辑
            </Button>
          ),
        ],
      }}
    >
      {editing ? (
        <Card>
          <ProForm
            form={form}
            onFinish={handleSave}
            submitter={{
              render: (props, doms) => (
                <Space>
                  <Button type="primary" icon={<SaveOutlined />} onClick={() => props.form?.submit?.()}>
                    保存
                  </Button>
                  <Button onClick={handleCancel}>
                    取消
                  </Button>
                </Space>
              ),
            }}
          >
            <ProForm.Group>
              <ProFormText
                name="title"
                label="询盘标题"
                width="md"
                rules={[{ required: true, message: '请输入询盘标题' }]}
              />
              <ProFormSelect
                name="status"
                label="状态"
                width="sm"
                options={[
                  { label: '新询盘', value: 'new' },
                  { label: '已联系', value: 'contacted' },
                  { label: '已报价', value: 'quoted' },
                  { label: '谈判中', value: 'negotiating' },
                  { label: '已成交', value: 'won' },
                  { label: '已失败', value: 'lost' },
                  { label: '已关闭', value: 'closed' },
                ]}
              />
              <ProFormSelect
                name="priority"
                label="优先级"
                width="sm"
                options={[
                  { label: '低', value: 'low' },
                  { label: '中', value: 'medium' },
                  { label: '高', value: 'high' },
                  { label: '紧急', value: 'urgent' },
                ]}
              />
            </ProForm.Group>

            <ProFormTextArea
              name="content"
              label="询盘内容"
              rules={[{ required: true, message: '请输入询盘内容' }]}
            />

            <ProForm.Group>
              <ProFormText name="customerName" label="客户姓名" width="md" />
              <ProFormText name="customerEmail" label="客户邮箱" width="md" />
              <ProFormText name="customerPhone" label="客户电话" width="md" />
            </ProForm.Group>

            <ProForm.Group>
              <ProFormText name="customerCompany" label="客户公司" width="md" />
              <ProFormText name="region" label="地区" width="md" />
              <ProFormText name="country" label="国家" width="md" />
            </ProForm.Group>

            <ProForm.Group>
              <ProFormSelect
                name="assignedTo"
                label="分配给"
                width="md"
                options={users.map(user => ({
                  label: `${user.fullName} (${user.email})`,
                  value: user.id,
                }))}
              />
              <ProFormDigit
                name="estimatedValue"
                label="预估价值"
                width="md"
                fieldProps={{ precision: 2 }}
              />
              <ProFormDatePicker
                name="expectedCloseDate"
                label="预期成交日期"
                width="md"
              />
            </ProForm.Group>
          </ProForm>
        </Card>
      ) : (
        <Card>
          <ProDescriptions
            column={2}
            dataSource={inquiry}
            columns={[
              {
                title: '询盘编号',
                dataIndex: 'inquiryNo',
                copyable: true,
              },
              {
                title: '状态',
                dataIndex: 'status',
                render: (_, record) => (
                  <Tag color={statusColorMap[record.status as keyof typeof statusColorMap]}>
                    {record.status === 'new' && '新询盘'}
                    {record.status === 'contacted' && '已联系'}
                    {record.status === 'quoted' && '已报价'}
                    {record.status === 'negotiating' && '谈判中'}
                    {record.status === 'won' && '已成交'}
                    {record.status === 'lost' && '已失败'}
                    {record.status === 'closed' && '已关闭'}
                  </Tag>
                ),
              },
              {
                title: '优先级',
                dataIndex: 'priority',
                render: (_, record) => (
                  <Tag color={priorityColorMap[record.priority as keyof typeof priorityColorMap]}>
                    {record.priority === 'low' && '低'}
                    {record.priority === 'medium' && '中'}
                    {record.priority === 'high' && '高'}
                    {record.priority === 'urgent' && '紧急'}
                  </Tag>
                ),
              },
              {
                title: '来源渠道',
                dataIndex: 'sourceChannel',
              },
              {
                title: '客户姓名',
                dataIndex: 'customerName',
              },
              {
                title: '客户邮箱',
                dataIndex: 'customerEmail',
                copyable: true,
              },
              {
                title: '客户电话',
                dataIndex: 'customerPhone',
                copyable: true,
              },
              {
                title: '客户公司',
                dataIndex: 'customerCompany',
              },
              {
                title: '地区',
                dataIndex: 'region',
              },
              {
                title: '国家',
                dataIndex: 'country',
              },
              {
                title: '分配给',
                dataIndex: 'assignee',
                render: (_, record) => record.assignee?.fullName || '-',
              },
              {
                title: '预估价值',
                dataIndex: 'estimatedValue',
                render: (_, record) => {
                  if (record.estimatedValue) {
                    return `${record.currency || 'USD'} ${record.estimatedValue.toLocaleString()}`;
                  }
                  return '-';
                },
              },
              {
                title: '预期成交日期',
                dataIndex: 'expectedCloseDate',
                valueType: 'date',
              },
              {
                title: '创建时间',
                dataIndex: 'createdAt',
                valueType: 'dateTime',
              },
              {
                title: '更新时间',
                dataIndex: 'updatedAt',
                valueType: 'dateTime',
              },
              {
                title: '询盘内容',
                dataIndex: 'content',
                span: 2,
                valueType: 'textarea',
              },
            ]}
          />
        </Card>
      )}
    </PageContainer>
  );
};

export default InquiryDetail;
