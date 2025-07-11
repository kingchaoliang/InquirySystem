import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import type { ActionType, ProColumns } from '@ant-design/pro-components';
import { PageContainer, ProTable, ModalForm, ProFormText, ProFormSelect, ProFormTextArea, ProFormSwitch, ProFormDigit } from '@ant-design/pro-components';
import { Button, Tag, Space, message, Modal, Popconfirm } from 'antd';
import { useRef, useState } from 'react';
import { getCustomFieldDefinitions, createCustomFieldDefinition, updateCustomFieldDefinition, deleteCustomFieldDefinition } from '@/services/customField';

const CustomFieldList: React.FC = () => {
  const actionRef = useRef<ActionType>();
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<API.CustomFieldDefinition | null>(null);

  // 字段类型选项
  const fieldTypeOptions = [
    { label: '文本', value: 'text' },
    { label: '数字', value: 'number' },
    { label: '日期', value: 'date' },
    { label: '日期时间', value: 'datetime' },
    { label: '单选', value: 'select' },
    { label: '多选', value: 'multiselect' },
    { label: '布尔值', value: 'boolean' },
    { label: '长文本', value: 'textarea' },
  ];

  // 状态标签颜色映射
  const statusColorMap = {
    active: 'green',
    inactive: 'red',
  };

  // 表格列定义
  const columns: ProColumns<API.CustomFieldDefinition>[] = [
    {
      title: '字段名称',
      dataIndex: 'fieldName',
      width: 150,
      fixed: 'left',
    },
    {
      title: '字段键名',
      dataIndex: 'fieldKey',
      width: 150,
      copyable: true,
    },
    {
      title: '字段类型',
      dataIndex: 'fieldType',
      width: 120,
      valueEnum: {
        text: { text: '文本' },
        number: { text: '数字' },
        date: { text: '日期' },
        datetime: { text: '日期时间' },
        select: { text: '单选' },
        multiselect: { text: '多选' },
        boolean: { text: '布尔值' },
        textarea: { text: '长文本' },
      },
    },
    {
      title: '字段选项',
      dataIndex: 'fieldOptions',
      width: 200,
      hideInSearch: true,
      render: (_, record) => {
        if (record.fieldOptions && record.fieldOptions.length > 0) {
          return record.fieldOptions.join(', ');
        }
        return '-';
      },
    },
    {
      title: '默认值',
      dataIndex: 'defaultValue',
      width: 120,
      hideInSearch: true,
      render: (text) => text || '-',
    },
    {
      title: '必填',
      dataIndex: 'isRequired',
      width: 80,
      hideInSearch: true,
      render: (_, record) => (
        <Tag color={record.isRequired ? 'red' : 'default'}>
          {record.isRequired ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '可搜索',
      dataIndex: 'isSearchable',
      width: 80,
      hideInSearch: true,
      render: (_, record) => (
        <Tag color={record.isSearchable ? 'blue' : 'default'}>
          {record.isSearchable ? '是' : '否'}
        </Tag>
      ),
    },
    {
      title: '显示顺序',
      dataIndex: 'displayOrder',
      width: 100,
      hideInSearch: true,
      sorter: true,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      valueEnum: {
        active: { text: '激活' },
        inactive: { text: '禁用' },
      },
      render: (_, record) => (
        <Tag color={statusColorMap[record.status as keyof typeof statusColorMap]}>
          {record.status === 'active' ? '激活' : '禁用'}
        </Tag>
      ),
    },
    {
      title: '描述',
      dataIndex: 'description',
      width: 200,
      hideInSearch: true,
      ellipsis: true,
      render: (text) => text || '-',
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
      width: 120,
      fixed: 'right',
      render: (text, record) => [
        <Button
          key="edit"
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>,
        <Popconfirm
          key="delete"
          title="确定要删除这个字段吗？"
          description="删除后无法恢复，请谨慎操作。"
          onConfirm={() => handleDelete(record)}
          okText="确定"
          cancelText="取消"
        >
          <Button
            type="link"
            size="small"
            danger
            icon={<DeleteOutlined />}
          >
            删除
          </Button>
        </Popconfirm>,
      ],
    },
  ];

  // 获取字段列表
  const fetchCustomFields = async (params: any) => {
    try {
      const response = await getCustomFieldDefinitions({
        page: params.current,
        pageSize: params.pageSize,
        search: params.fieldName || params.fieldKey,
        fieldType: params.fieldType,
        status: params.status,
      });

      if (response.success) {
        return {
          data: response.data.fields,
          success: true,
          total: response.data.total,
        };
      } else {
        message.error(response.message || '获取字段列表失败');
        return {
          data: [],
          success: false,
          total: 0,
        };
      }
    } catch (error: any) {
      message.error(error.message || '获取字段列表失败');
      return {
        data: [],
        success: false,
        total: 0,
      };
    }
  };

  // 创建字段
  const handleCreate = async (values: any) => {
    try {
      const response = await createCustomFieldDefinition(values);
      if (response.success) {
        message.success('创建字段成功');
        setCreateModalVisible(false);
        actionRef.current?.reload();
        return true;
      } else {
        message.error(response.message || '创建字段失败');
        return false;
      }
    } catch (error: any) {
      message.error(error.message || '创建字段失败');
      return false;
    }
  };

  // 编辑字段
  const handleEdit = (record: API.CustomFieldDefinition) => {
    setCurrentRecord(record);
    setEditModalVisible(true);
  };

  // 更新字段
  const handleUpdate = async (values: any) => {
    if (!currentRecord) return false;

    try {
      const response = await updateCustomFieldDefinition(currentRecord.id, values);
      if (response.success) {
        message.success('更新字段成功');
        setEditModalVisible(false);
        setCurrentRecord(null);
        actionRef.current?.reload();
        return true;
      } else {
        message.error(response.message || '更新字段失败');
        return false;
      }
    } catch (error: any) {
      message.error(error.message || '更新字段失败');
      return false;
    }
  };

  // 删除字段
  const handleDelete = async (record: API.CustomFieldDefinition) => {
    try {
      const response = await deleteCustomFieldDefinition(record.id);
      if (response.success) {
        message.success('删除字段成功');
        actionRef.current?.reload();
      } else {
        message.error(response.message || '删除字段失败');
      }
    } catch (error: any) {
      message.error(error.message || '删除字段失败');
    }
  };

  return (
    <PageContainer>
      <ProTable<API.CustomFieldDefinition>
        headerTitle="自定义字段管理"
        actionRef={actionRef}
        rowKey="id"
        search={{
          labelWidth: 120,
        }}
        toolBarRender={() => [
          <Button
            type="primary"
            key="primary"
            onClick={() => setCreateModalVisible(true)}
          >
            <PlusOutlined /> 新建字段
          </Button>,
        ]}
        request={fetchCustomFields}
        columns={columns}
        scroll={{ x: 1500 }}
        pagination={{
          pageSize: 20,
          showSizeChanger: true,
          showQuickJumper: true,
        }}
      />

      {/* 创建字段弹窗 */}
      <ModalForm
        title="创建自定义字段"
        width={600}
        open={createModalVisible}
        onOpenChange={setCreateModalVisible}
        onFinish={handleCreate}
        modalProps={{
          destroyOnClose: true,
        }}
      >
        <ProFormText
          name="fieldName"
          label="字段名称"
          rules={[{ required: true, message: '请输入字段名称' }]}
          placeholder="请输入字段显示名称"
        />
        <ProFormText
          name="fieldKey"
          label="字段键名"
          rules={[
            { required: true, message: '请输入字段键名' },
            { pattern: /^[a-zA-Z][a-zA-Z0-9_]*$/, message: '字段键名只能包含字母、数字和下划线，且以字母开头' }
          ]}
          placeholder="请输入字段键名（用于程序识别）"
        />
        <ProFormSelect
          name="fieldType"
          label="字段类型"
          options={fieldTypeOptions}
          rules={[{ required: true, message: '请选择字段类型' }]}
          placeholder="请选择字段类型"
        />
        <ProFormTextArea
          name="fieldOptions"
          label="字段选项"
          tooltip="对于选择类型字段，请输入选项，每行一个"
          placeholder="请输入字段选项，每行一个（仅选择类型字段需要）"
          fieldProps={{
            rows: 4,
          }}
        />
        <ProFormText
          name="defaultValue"
          label="默认值"
          placeholder="请输入默认值（可选）"
        />
        <ProFormDigit
          name="displayOrder"
          label="显示顺序"
          min={0}
          placeholder="请输入显示顺序（数字越小越靠前）"
        />
        <ProFormSwitch
          name="isRequired"
          label="是否必填"
          tooltip="设置为必填后，用户在填写表单时必须填写此字段"
        />
        <ProFormSwitch
          name="isSearchable"
          label="是否可搜索"
          tooltip="设置为可搜索后，此字段可以在搜索中使用"
          initialValue={true}
        />
        <ProFormTextArea
          name="description"
          label="字段描述"
          placeholder="请输入字段描述（可选）"
          fieldProps={{
            rows: 3,
          }}
        />
      </ModalForm>

      {/* 编辑字段弹窗 */}
      <ModalForm
        title="编辑自定义字段"
        width={600}
        open={editModalVisible}
        onOpenChange={setEditModalVisible}
        onFinish={handleUpdate}
        initialValues={currentRecord || {}}
        modalProps={{
          destroyOnClose: true,
        }}
      >
        <ProFormText
          name="fieldName"
          label="字段名称"
          rules={[{ required: true, message: '请输入字段名称' }]}
          placeholder="请输入字段显示名称"
        />
        <ProFormText
          name="fieldKey"
          label="字段键名"
          disabled
          tooltip="字段键名创建后不可修改"
        />
        <ProFormSelect
          name="fieldType"
          label="字段类型"
          options={fieldTypeOptions}
          rules={[{ required: true, message: '请选择字段类型' }]}
          placeholder="请选择字段类型"
        />
        <ProFormTextArea
          name="fieldOptions"
          label="字段选项"
          tooltip="对于选择类型字段，请输入选项，每行一个"
          placeholder="请输入字段选项，每行一个（仅选择类型字段需要）"
          fieldProps={{
            rows: 4,
          }}
          transform={(value) => {
            if (typeof value === 'string') {
              return value.split('\n').filter(item => item.trim());
            }
            return value;
          }}
        />
        <ProFormText
          name="defaultValue"
          label="默认值"
          placeholder="请输入默认值（可选）"
        />
        <ProFormDigit
          name="displayOrder"
          label="显示顺序"
          min={0}
          placeholder="请输入显示顺序（数字越小越靠前）"
        />
        <ProFormSwitch
          name="isRequired"
          label="是否必填"
          tooltip="设置为必填后，用户在填写表单时必须填写此字段"
        />
        <ProFormSwitch
          name="isSearchable"
          label="是否可搜索"
          tooltip="设置为可搜索后，此字段可以在搜索中使用"
        />
        <ProFormSelect
          name="status"
          label="状态"
          options={[
            { label: '激活', value: 'active' },
            { label: '禁用', value: 'inactive' },
          ]}
          rules={[{ required: true, message: '请选择状态' }]}
        />
        <ProFormTextArea
          name="description"
          label="字段描述"
          placeholder="请输入字段描述（可选）"
          fieldProps={{
            rows: 3,
          }}
        />
      </ModalForm>
    </PageContainer>
  );
};

export default CustomFieldList;
