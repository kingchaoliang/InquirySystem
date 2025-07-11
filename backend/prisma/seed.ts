import { PrismaClient, UserRole, UserStatus, DepartmentStatus } from '@prisma/client';
import { CryptoUtils } from '../src/utils/crypto';

const prisma = new PrismaClient();

async function main() {
  console.log('开始初始化数据库...');

  // 创建部门
  console.log('创建部门...');
  const salesDepartment = await prisma.department.create({
    data: {
      name: '销售部',
      description: '负责产品销售和客户关系管理',
      status: DepartmentStatus.active,
    },
  });

  const marketingDepartment = await prisma.department.create({
    data: {
      name: '市场部',
      description: '负责市场推广和品牌建设',
      status: DepartmentStatus.active,
    },
  });

  const customerServiceDepartment = await prisma.department.create({
    data: {
      name: '客服部',
      description: '负责客户服务和售后支持',
      status: DepartmentStatus.active,
    },
  });

  // 创建子部门
  const domesticSalesDepartment = await prisma.department.create({
    data: {
      name: '国内销售部',
      description: '负责国内市场销售',
      parentId: salesDepartment.id,
      status: DepartmentStatus.active,
    },
  });

  const internationalSalesDepartment = await prisma.department.create({
    data: {
      name: '国际销售部',
      description: '负责国际市场销售',
      parentId: salesDepartment.id,
      status: DepartmentStatus.active,
    },
  });

  // 创建管理员用户
  console.log('创建管理员用户...');
  const adminPassword = await CryptoUtils.hashPassword('Admin123456');
  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@example.com',
      passwordHash: adminPassword,
      fullName: '系统管理员',
      role: UserRole.admin,
      status: UserStatus.active,
    },
  });

  // 创建销售经理
  console.log('创建销售经理...');
  const salesManagerPassword = await CryptoUtils.hashPassword('Manager123456');
  const salesManager = await prisma.user.create({
    data: {
      username: 'sales_manager',
      email: 'sales.manager@example.com',
      passwordHash: salesManagerPassword,
      fullName: '张经理',
      phone: '13800138001',
      role: UserRole.manager,
      departmentId: salesDepartment.id,
      status: UserStatus.active,
    },
  });

  // 更新销售部门的经理
  await prisma.department.update({
    where: { id: salesDepartment.id },
    data: { managerId: salesManager.id },
  });

  // 创建销售人员
  console.log('创建销售人员...');
  const salesPassword = await CryptoUtils.hashPassword('Sales123456');
  const salesPerson1 = await prisma.user.create({
    data: {
      username: 'sales_001',
      email: 'sales001@example.com',
      passwordHash: salesPassword,
      fullName: '李销售',
      phone: '13800138002',
      role: UserRole.sales,
      departmentId: domesticSalesDepartment.id,
      status: UserStatus.active,
    },
  });

  const salesPerson2 = await prisma.user.create({
    data: {
      username: 'sales_002',
      email: 'sales002@example.com',
      passwordHash: salesPassword,
      fullName: '王销售',
      phone: '13800138003',
      role: UserRole.sales,
      departmentId: internationalSalesDepartment.id,
      status: UserStatus.active,
    },
  });

  // 创建客服人员
  console.log('创建客服人员...');
  const customerServicePassword = await CryptoUtils.hashPassword('Service123456');
  const customerService = await prisma.user.create({
    data: {
      username: 'service_001',
      email: 'service001@example.com',
      passwordHash: customerServicePassword,
      fullName: '赵客服',
      phone: '13800138004',
      role: UserRole.customer_service,
      departmentId: customerServiceDepartment.id,
      status: UserStatus.active,
    },
  });

  // 创建自定义字段定义
  console.log('创建自定义字段定义...');
  await prisma.customFieldDefinition.createMany({
    data: [
      {
        fieldName: '跟进推广员',
        fieldKey: 'follow_up_promoter',
        fieldType: 'text',
        isRequired: false,
        isSearchable: true,
        displayOrder: 1,
        description: '负责跟进的推广员姓名',
        createdBy: admin.id,
      },
      {
        fieldName: '跟进状态',
        fieldKey: 'follow_up_status',
        fieldType: 'select',
        fieldOptions: ['未跟进', '已联系', '待回复', '已报价', '跟进中', '已成交', '已放弃'],
        defaultValue: '未跟进',
        isRequired: false,
        isSearchable: true,
        displayOrder: 2,
        description: '当前跟进状态',
        createdBy: admin.id,
      },
      {
        fieldName: '客户等级',
        fieldKey: 'customer_level',
        fieldType: 'select',
        fieldOptions: ['A级', 'B级', 'C级', 'D级'],
        defaultValue: 'C级',
        isRequired: false,
        isSearchable: true,
        displayOrder: 3,
        description: '客户重要程度等级',
        createdBy: admin.id,
      },
      {
        fieldName: '预计成交时间',
        fieldKey: 'expected_deal_date',
        fieldType: 'date',
        isRequired: false,
        isSearchable: false,
        displayOrder: 4,
        description: '预计成交的时间',
        createdBy: admin.id,
      },
      {
        fieldName: '客户备注',
        fieldKey: 'customer_notes',
        fieldType: 'textarea',
        isRequired: false,
        isSearchable: true,
        displayOrder: 5,
        description: '客户相关备注信息',
        createdBy: admin.id,
      },
    ],
  });

  // 创建示例询盘
  console.log('创建示例询盘...');
  const inquiries = [];
  for (let i = 1; i <= 10; i++) {
    const inquiry = await prisma.inquiry.create({
      data: {
        inquiryNo: CryptoUtils.generateInquiryNo(),
        title: `产品询盘 ${i}`,
        content: `这是第${i}个示例询盘，客户对我们的产品很感兴趣，希望了解更多详细信息和报价。`,
        sourceChannel: ['website', 'email', 'phone', 'exhibition'][i % 4],
        customerName: `客户${i}`,
        customerEmail: `customer${i}@example.com`,
        customerPhone: `1380013800${i}`,
        customerCompany: `公司${i}`,
        customerType: ['individual', 'enterprise', 'government'][i % 3],
        region: ['华北', '华东', '华南', '华中', '西南'][i % 5],
        country: '中国',
        assignedTo: i % 2 === 0 ? salesPerson1.id : salesPerson2.id,
        departmentId: i % 2 === 0 ? domesticSalesDepartment.id : internationalSalesDepartment.id,
        priority: ['low', 'medium', 'high', 'urgent'][i % 4],
        status: ['new', 'contacted', 'quoted', 'negotiating'][i % 4],
        estimatedValue: Math.floor(Math.random() * 100000) + 10000,
        currency: 'USD',
        customFields: {
          follow_up_promoter: `推广员${i}`,
          follow_up_status: ['未跟进', '已联系', '待回复'][i % 3],
          customer_level: ['A级', 'B级', 'C级'][i % 3],
        },
        createdBy: i % 2 === 0 ? salesPerson1.id : salesPerson2.id,
      },
    });
    inquiries.push(inquiry);
  }

  // 创建跟进记录
  console.log('创建跟进记录...');
  for (const inquiry of inquiries.slice(0, 5)) {
    await prisma.followUpRecord.create({
      data: {
        inquiryId: inquiry.id,
        followUpType: 'phone',
        content: '电话联系客户，了解具体需求',
        result: 'interested',
        nextFollowUpDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7天后
        createdBy: inquiry.createdBy,
      },
    });
  }

  // 创建系统配置
  console.log('创建系统配置...');
  await prisma.systemConfig.createMany({
    data: [
      {
        configKey: 'system_name',
        configValue: 'AI询盘管理CRM系统',
        configType: 'string',
        description: '系统名称',
      },
      {
        configKey: 'default_currency',
        configValue: 'USD',
        configType: 'string',
        description: '默认货币',
      },
      {
        configKey: 'inquiry_auto_assign',
        configValue: 'true',
        configType: 'boolean',
        description: '是否自动分配询盘',
      },
      {
        configKey: 'ai_analysis_enabled',
        configValue: 'true',
        configType: 'boolean',
        description: '是否启用AI分析',
      },
    ],
  });

  console.log('数据库初始化完成！');
  console.log('默认账户信息：');
  console.log('管理员: admin@example.com / Admin123456');
  console.log('销售经理: sales.manager@example.com / Manager123456');
  console.log('销售人员: sales001@example.com / Sales123456');
  console.log('客服人员: service001@example.com / Service123456');
}

main()
  .catch((e) => {
    console.error('数据库初始化失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
