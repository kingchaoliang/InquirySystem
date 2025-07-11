import { PageContainer } from '@ant-design/pro-components';
import { Card, Typography, Row, Col, Statistic } from 'antd';
import { UserOutlined, FileTextOutlined, RobotOutlined, CheckCircleOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

const Welcome: React.FC = () => {
  return (
    <PageContainer>
      <Card>
        <Title level={2}>欢迎使用AI询盘管理CRM系统</Title>
        <Paragraph>
          这是一个基于AI技术的智能询盘管理系统，帮助您更高效地管理客户询盘，提升销售转化率。
        </Paragraph>
        
        <Row gutter={16} style={{ marginTop: 32 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="总询盘数"
                value={0}
                prefix={<FileTextOutlined />}
                valueStyle={{ color: '#3f8600' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="待跟进"
                value={0}
                prefix={<UserOutlined />}
                valueStyle={{ color: '#cf1322' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="AI分析次数"
                value={0}
                prefix={<RobotOutlined />}
                valueStyle={{ color: '#1890ff' }}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="成交数量"
                value={0}
                prefix={<CheckCircleOutlined />}
                valueStyle={{ color: '#722ed1' }}
              />
            </Card>
          </Col>
        </Row>

        <Card style={{ marginTop: 24 }}>
          <Title level={4}>系统功能</Title>
          <Row gutter={[16, 16]}>
            <Col span={8}>
              <Card size="small">
                <Title level={5}>📋 询盘管理</Title>
                <Paragraph>
                  完整的询盘生命周期管理，支持自定义字段和批量操作
                </Paragraph>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Title level={5}>🤖 AI智能分析</Title>
                <Paragraph>
                  集成多个AI平台，智能分析询盘内容和客户意向
                </Paragraph>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Title level={5}>👥 权限管理</Title>
                <Paragraph>
                  基于角色的权限控制，确保数据安全和访问控制
                </Paragraph>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Title level={5}>📊 数据统计</Title>
                <Paragraph>
                  丰富的报表和数据分析功能，助力业务决策
                </Paragraph>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Title level={5}>🔄 跟进管理</Title>
                <Paragraph>
                  完整的客户跟进记录和提醒系统
                </Paragraph>
              </Card>
            </Col>
            <Col span={8}>
              <Card size="small">
                <Title level={5}>⚙️ 自定义配置</Title>
                <Paragraph>
                  灵活的自定义字段和表头配置功能
                </Paragraph>
              </Card>
            </Col>
          </Row>
        </Card>
      </Card>
    </PageContainer>
  );
};

export default Welcome;
