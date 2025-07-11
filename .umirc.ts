import { defineConfig } from '@umijs/max';

export default defineConfig({
  antd: {},
  access: {},
  model: {},
  initialState: {},
  request: {},
  layout: {
    title: 'AI询盘管理CRM系统',
  },
  routes: [
    {
      path: '/user',
      layout: false,
      routes: [
        {
          name: 'login',
          path: '/user/login',
          component: './User/Login',
        },
      ],
    },
    {
      path: '/welcome',
      name: 'welcome',
      icon: 'smile',
      component: './Welcome',
    },
    {
      path: '/inquiry',
      name: 'inquiry',
      icon: 'table',
      routes: [
        {
          path: '/inquiry/list',
          name: 'list',
          component: './Inquiry/List',
        },
        {
          path: '/inquiry/detail/:id',
          name: 'detail',
          component: './Inquiry/Detail',
          hideInMenu: true,
        },
        {
          path: '/inquiry/create',
          name: 'create',
          component: './Inquiry/Create',
        },
      ],
    },
    {
      path: '/ai-analysis',
      name: 'ai-analysis',
      icon: 'robot',
      component: './AIAnalysis',
    },
    {
      path: '/follow-up',
      name: 'follow-up',
      icon: 'schedule',
      component: './FollowUp',
    },
    {
      path: '/statistics',
      name: 'statistics',
      icon: 'bar-chart',
      component: './Statistics',
    },
    {
      path: '/settings',
      name: 'settings',
      icon: 'setting',
      routes: [
        {
          path: '/settings/custom-fields',
          name: 'custom-fields',
          component: './Settings/CustomFields',
        },
        {
          path: '/settings/users',
          name: 'users',
          component: './Settings/Users',
        },
        {
          path: '/settings/system',
          name: 'system',
          component: './Settings/System',
        },
      ],
    },
    {
      path: '/',
      redirect: '/welcome',
    },
    {
      path: '*',
      layout: false,
      component: './404',
    },
  ],
  npmClient: 'npm',
  tailwindcss: {},
  locale: {
    default: 'zh-CN',
    antd: true,
    baseNavigator: true,
  },
  proxy: {
    '/api': {
      target: 'http://localhost:3001',
      changeOrigin: true,
      pathRewrite: { '^/api': '/api' },
    },
  },
});
