import { SaveOutlined } from '@ant-design/icons';
import { PageContainer, ProForm, ProFormText, ProFormTextArea, ProFormSelect, ProFormDigit, ProFormDatePicker } from '@ant-design/pro-components';
import { Card, message } from 'antd';
import { useEffect, useState } from 'react';
import { history } from '@umijs/max';
import { createInquiry, getUserList, getDepartmentTree } from '@/services/inquiry';

const InquiryCreate: React.FC = () => {
  const [users, setUsers] = useState<API.CurrentUser[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [form] = ProForm.useForm();

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
    fetchUsers();
    fetchDepartments();
  }, []);

  // 创建询盘
  const handleSubmit = async (values: any) => {
    try {
      const response = await createInquiry(values);
      if (response.success) {
        message.success('创建询盘成功');
        history.push(`/inquiry/detail/${response.data.id}`);
      } else {
        message.error(response.message || '创建询盘失败');
      }
    } catch (error: any) {
      message.error(error.message || '创建询盘失败');
    }
  };

  return (
    <PageContainer
      header={{
        title: '创建询盘',
        onBack: () => history.goBack(),
      }}
    >
      <Card>
        <ProForm
          form={form}
          onFinish={handleSubmit}
          submitter={{
            searchConfig: {
              submitText: '创建询盘',
            },
            render: (props, doms) => [
              <div key="submit" style={{ textAlign: 'center' }}>
                {doms[1]}
              </div>
            ],
          }}
          initialValues={{
            priority: 'medium',
            customerType: 'individual',
            currency: 'USD',
            country: '中国',
          }}
        >
          <ProForm.Group>
            <ProFormText
              name="title"
              label="询盘标题"
              width="md"
              rules={[{ required: true, message: '请输入询盘标题' }]}
              placeholder="请输入询盘标题"
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
            <ProFormText
              name="sourceChannel"
              label="来源渠道"
              width="sm"
              rules={[{ required: true, message: '请输入来源渠道' }]}
              placeholder="如：官网、邮件、电话等"
            />
          </ProForm.Group>

          <ProFormTextArea
            name="content"
            label="询盘内容"
            rules={[{ required: true, message: '请输入询盘内容' }]}
            placeholder="请详细描述客户的询盘内容"
          />

          <ProForm.Group>
            <ProFormText
              name="customerName"
              label="客户姓名"
              width="md"
              rules={[{ required: true, message: '请输入客户姓名' }]}
              placeholder="请输入客户姓名"
            />
            <ProFormText
              name="customerEmail"
              label="客户邮箱"
              width="md"
              rules={[
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
              placeholder="请输入客户邮箱"
            />
            <ProFormText
              name="customerPhone"
              label="客户电话"
              width="md"
              placeholder="请输入客户电话"
            />
          </ProForm.Group>

          <ProForm.Group>
            <ProFormText
              name="customerCompany"
              label="客户公司"
              width="md"
              placeholder="请输入客户公司名称"
            />
            <ProFormSelect
              name="customerType"
              label="客户类型"
              width="sm"
              options={[
                { label: '个人客户', value: 'individual' },
                { label: '企业客户', value: 'enterprise' },
                { label: '政府客户', value: 'government' },
                { label: '其他', value: 'other' },
              ]}
            />
          </ProForm.Group>

          <ProForm.Group>
            <ProFormText
              name="region"
              label="地区"
              width="md"
              placeholder="请输入地区"
            />
            <ProFormText
              name="country"
              label="国家"
              width="md"
              placeholder="请输入国家"
            />
          </ProForm.Group>

          <ProFormTextArea
            name="customerAddress"
            label="客户地址"
            placeholder="请输入客户详细地址"
          />

          <ProForm.Group>
            <ProFormSelect
              name="assignedTo"
              label="分配给"
              width="md"
              placeholder="请选择负责人"
              options={users.map(user => ({
                label: `${user.fullName} (${user.email})`,
                value: user.id,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
            <ProFormSelect
              name="departmentId"
              label="所属部门"
              width="md"
              placeholder="请选择部门"
              options={departments.map(dept => ({
                label: dept.name,
                value: dept.id,
              }))}
              showSearch
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
            />
          </ProForm.Group>

          <ProForm.Group>
            <ProFormDigit
              name="estimatedValue"
              label="预估价值"
              width="md"
              fieldProps={{ 
                precision: 2,
                min: 0,
                formatter: (value) => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ','),
                parser: (value) => value!.replace(/\$\s?|(,*)/g, ''),
              }}
              placeholder="请输入预估价值"
            />
            <ProFormSelect
              name="currency"
              label="货币"
              width="sm"
              options={[
                { label: 'USD', value: 'USD' },
                { label: 'CNY', value: 'CNY' },
                { label: 'EUR', value: 'EUR' },
                { label: 'GBP', value: 'GBP' },
                { label: 'JPY', value: 'JPY' },
              ]}
            />
            <ProFormDatePicker
              name="expectedCloseDate"
              label="预期成交日期"
              width="md"
              placeholder="请选择预期成交日期"
            />
          </ProForm.Group>
        </ProForm>
      </Card>
    </PageContainer>
  );
};

export default InquiryCreate;
