import { SaveOutlined, ReloadOutlined, EyeOutlined, EyeInvisibleOutlined } from '@ant-design/icons';
import { PageContainer } from '@ant-design/pro-components';
import { Card, Button, Table, Switch, InputNumber, Space, message, Popconfirm } from 'antd';
import { useEffect, useState } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { getUserCustomFieldConfigs, updateUserCustomFieldConfigs, resetUserCustomFieldConfigs, getActiveCustomFields } from '@/services/customField';

interface DragItem {
  index: number;
  id: string;
  type: string;
}

interface FieldConfigItem {
  id: number;
  fieldId: number;
  fieldName: string;
  fieldType: string;
  isVisible: boolean;
  displayOrder: number;
  columnWidth?: number;
}

const DragableBodyRow = ({ index, moveRow, className, style, ...restProps }: any) => {
  const ref = React.useRef<HTMLTableRowElement>(null);
  const [{ isOver, dropClassName }, drop] = useDrop({
    accept: 'row',
    collect: (monitor) => {
      const { index: dragIndex } = monitor.getItem() || {};
      if (dragIndex === index) {
        return {};
      }
      return {
        isOver: monitor.isOver(),
        dropClassName: dragIndex < index ? ' drop-over-downward' : ' drop-over-upward',
      };
    },
    drop: (item: DragItem) => {
      moveRow(item.index, index);
    },
  });
  const [, drag] = useDrag({
    type: 'row',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });
  drop(drag(ref));

  return (
    <tr
      ref={ref}
      className={`${className}${isOver ? dropClassName : ''}`}
      style={{ cursor: 'move', ...style }}
      {...restProps}
    />
  );
};

const CustomFieldConfig: React.FC = () => {
  const [configs, setConfigs] = useState<FieldConfigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // 获取用户字段配置
  const fetchConfigs = async () => {
    try {
      setLoading(true);
      
      // 先获取用户配置
      const configResponse = await getUserCustomFieldConfigs();
      
      if (configResponse.success && configResponse.data.length > 0) {
        // 如果有用户配置，直接使用
        const configItems = configResponse.data.map((config: any) => ({
          id: config.id,
          fieldId: config.fieldId,
          fieldName: config.field.fieldName,
          fieldType: config.field.fieldType,
          isVisible: config.isVisible,
          displayOrder: config.displayOrder,
          columnWidth: config.columnWidth,
        }));
        setConfigs(configItems.sort((a, b) => a.displayOrder - b.displayOrder));
      } else {
        // 如果没有用户配置，获取所有激活字段作为默认配置
        const fieldsResponse = await getActiveCustomFields();
        if (fieldsResponse.success) {
          const defaultConfigs = fieldsResponse.data.map((field: any, index: number) => ({
            id: 0, // 新配置，ID为0
            fieldId: field.id,
            fieldName: field.fieldName,
            fieldType: field.fieldType,
            isVisible: true,
            displayOrder: field.displayOrder || index,
            columnWidth: 150,
          }));
          setConfigs(defaultConfigs.sort((a, b) => a.displayOrder - b.displayOrder));
        }
      }
    } catch (error: any) {
      message.error(error.message || '获取字段配置失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  // 移动行
  const moveRow = (dragIndex: number, hoverIndex: number) => {
    const newConfigs = [...configs];
    const dragRow = newConfigs[dragIndex];
    newConfigs.splice(dragIndex, 1);
    newConfigs.splice(hoverIndex, 0, dragRow);
    
    // 更新显示顺序
    const updatedConfigs = newConfigs.map((config, index) => ({
      ...config,
      displayOrder: index,
    }));
    
    setConfigs(updatedConfigs);
  };

  // 切换可见性
  const toggleVisibility = (fieldId: number) => {
    setConfigs(configs.map(config => 
      config.fieldId === fieldId 
        ? { ...config, isVisible: !config.isVisible }
        : config
    ));
  };

  // 更新列宽
  const updateColumnWidth = (fieldId: number, width: number) => {
    setConfigs(configs.map(config => 
      config.fieldId === fieldId 
        ? { ...config, columnWidth: width }
        : config
    ));
  };

  // 保存配置
  const handleSave = async () => {
    try {
      setSaving(true);
      const configData = configs.map(config => ({
        fieldId: config.fieldId,
        isVisible: config.isVisible,
        displayOrder: config.displayOrder,
        columnWidth: config.columnWidth,
      }));

      const response = await updateUserCustomFieldConfigs(configData);
      if (response.success) {
        message.success('保存配置成功');
      } else {
        message.error(response.message || '保存配置失败');
      }
    } catch (error: any) {
      message.error(error.message || '保存配置失败');
    } finally {
      setSaving(false);
    }
  };

  // 重置配置
  const handleReset = async () => {
    try {
      setSaving(true);
      const response = await resetUserCustomFieldConfigs();
      if (response.success) {
        message.success('重置配置成功');
        await fetchConfigs(); // 重新获取配置
      } else {
        message.error(response.message || '重置配置失败');
      }
    } catch (error: any) {
      message.error(error.message || '重置配置失败');
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      title: '字段名称',
      dataIndex: 'fieldName',
      width: 200,
    },
    {
      title: '字段类型',
      dataIndex: 'fieldType',
      width: 120,
      render: (type: string) => {
        const typeMap: Record<string, string> = {
          text: '文本',
          number: '数字',
          date: '日期',
          datetime: '日期时间',
          select: '单选',
          multiselect: '多选',
          boolean: '布尔值',
          textarea: '长文本',
        };
        return typeMap[type] || type;
      },
    },
    {
      title: '是否显示',
      dataIndex: 'isVisible',
      width: 120,
      render: (visible: boolean, record: FieldConfigItem) => (
        <Switch
          checked={visible}
          onChange={() => toggleVisibility(record.fieldId)}
          checkedChildren={<EyeOutlined />}
          unCheckedChildren={<EyeInvisibleOutlined />}
        />
      ),
    },
    {
      title: '列宽',
      dataIndex: 'columnWidth',
      width: 120,
      render: (width: number, record: FieldConfigItem) => (
        <InputNumber
          min={80}
          max={500}
          value={width || 150}
          onChange={(value) => updateColumnWidth(record.fieldId, value || 150)}
          addonAfter="px"
        />
      ),
    },
    {
      title: '显示顺序',
      dataIndex: 'displayOrder',
      width: 100,
      render: (order: number) => order + 1,
    },
  ];

  const components = {
    body: {
      row: DragableBodyRow,
    },
  };

  return (
    <PageContainer>
      <Card
        title="自定义字段配置"
        extra={
          <Space>
            <Popconfirm
              title="确定要重置配置吗？"
              description="重置后将恢复为系统默认配置"
              onConfirm={handleReset}
              okText="确定"
              cancelText="取消"
            >
              <Button icon={<ReloadOutlined />} loading={saving}>
                重置配置
              </Button>
            </Popconfirm>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              loading={saving}
              onClick={handleSave}
            >
              保存配置
            </Button>
          </Space>
        }
      >
        <div style={{ marginBottom: 16 }}>
          <p>
            <strong>使用说明：</strong>
          </p>
          <ul>
            <li>拖拽行可以调整字段显示顺序</li>
            <li>使用开关控制字段是否在表格中显示</li>
            <li>调整列宽可以优化表格显示效果</li>
            <li>配置保存后将在询盘列表中生效</li>
          </ul>
        </div>

        <DndProvider backend={HTML5Backend}>
          <Table
            columns={columns}
            dataSource={configs}
            rowKey="fieldId"
            loading={loading}
            pagination={false}
            components={components}
            onRow={(record, index) => ({
              index,
              moveRow,
            })}
            scroll={{ y: 400 }}
          />
        </DndProvider>

        <style jsx>{`
          .drop-over-downward {
            border-bottom: 2px dashed #1890ff;
          }
          .drop-over-upward {
            border-top: 2px dashed #1890ff;
          }
        `}</style>
      </Card>
    </PageContainer>
  );
};

export default CustomFieldConfig;
