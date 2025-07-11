import type { Settings as LayoutSettings } from '@ant-design/pro-components';
import { SettingDrawer } from '@ant-design/pro-components';
import type { RunTimeLayoutConfig } from '@umijs/max';
import { history } from '@umijs/max';
import { Avatar, Dropdown, Space, message } from 'antd';
import { LogoutOutlined, UserOutlined, SettingOutlined } from '@ant-design/icons';
import defaultSettings from '../config/defaultSettings';
import { errorConfig } from './requestErrorConfig';
import { currentUser as queryCurrentUser, outLogin } from './services/ant-design-pro/api';

const isDev = process.env.NODE_ENV === 'development';
const loginPath = '/user/login';

/**
 * @see  https://umijs.org/zh-CN/plugins/plugin-initial-state
 * */
export async function getInitialState(): Promise<{
  settings?: Partial<LayoutSettings>;
  currentUser?: API.CurrentUser;
  loading?: boolean;
  fetchUserInfo?: () => Promise<API.CurrentUser | undefined>;
}> {
  const fetchUserInfo = async () => {
    try {
      // 检查是否有token
      const token = localStorage.getItem('token');
      if (!token) {
        return undefined;
      }

      const response = await queryCurrentUser({
        skipErrorHandler: true,
      });

      if (response.success) {
        return response.data;
      } else {
        // token无效，清除并跳转到登录页
        localStorage.removeItem('token');
        return undefined;
      }
    } catch (error) {
      // 请求失败，清除token并跳转到登录页
      localStorage.removeItem('token');
      return undefined;
    }
  };

  // 如果不是登录页面，执行
  const { location } = history;
  if (location.pathname !== loginPath) {
    const currentUser = await fetchUserInfo();
    if (!currentUser) {
      history.push(loginPath);
    }
    return {
      fetchUserInfo,
      currentUser,
      settings: defaultSettings as Partial<LayoutSettings>,
    };
  }
  return {
    fetchUserInfo,
    settings: defaultSettings as Partial<LayoutSettings>,
  };
}

// 登出处理
const handleLogout = async () => {
  try {
    await outLogin();
    localStorage.removeItem('token');
    message.success('登出成功');
    history.push(loginPath);
  } catch (error) {
    console.error('登出失败:', error);
    // 即使登出API失败，也清除本地token
    localStorage.removeItem('token');
    history.push(loginPath);
  }
};

// 用户头像下拉菜单
const AvatarDropdown = ({ currentUser }: { currentUser?: API.CurrentUser }) => {
  const menuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人中心',
      onClick: () => history.push('/user/profile'),
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: '个人设置',
      onClick: () => history.push('/user/settings'),
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  return (
    <Dropdown menu={{ items: menuItems }} placement="bottomRight">
      <Space style={{ cursor: 'pointer', padding: '0 12px' }}>
        <Avatar
          size="small"
          src={currentUser?.avatarUrl}
          icon={!currentUser?.avatarUrl && <UserOutlined />}
        />
        <span>{currentUser?.fullName || currentUser?.username}</span>
      </Space>
    </Dropdown>
  );
};

// ProLayout 支持的api https://procomponents.ant.design/components/layout
export const layout: RunTimeLayoutConfig = ({ initialState, setInitialState }) => {
  return {
    rightContentRender: () => {
      if (!initialState?.currentUser) {
        return null;
      }
      return <AvatarDropdown currentUser={initialState.currentUser} />;
    },
    waterMarkProps: {
      content: initialState?.currentUser?.fullName || initialState?.currentUser?.username,
    },
    footerRender: () => <div>AI询盘管理CRM系统 ©2024</div>,
    onPageChange: () => {
      const { location } = history;
      // 如果没有登录，重定向到 login
      if (!initialState?.currentUser && location.pathname !== loginPath) {
        history.push(loginPath);
      }
    },
    layoutBgImgList: [
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/D2LWSqNny4sAAAAAAAAAAAAAFl94AQBr',
        left: 85,
        bottom: 100,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/C2TWRpJpiC0AAAAAAAAAAAAAFl94AQBr',
        bottom: -68,
        right: -45,
        height: '303px',
      },
      {
        src: 'https://mdn.alipayobjects.com/yuyan_qk0oxh/afts/img/F6vSTbj8KpYAAAAAAAAAAAAAFl94AQBr',
        bottom: 0,
        left: 0,
        width: '331px',
      },
    ],
    links: isDev
      ? [
          <div key="dev">
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          </div>,
        ]
      : [],
    menuHeaderRender: undefined,
    // 自定义 403 页面
    // unAccessible: <div>unAccessible</div>,
    // 增加一个 loading 的状态
    childrenRender: (children) => {
      // if (initialState?.loading) return <PageLoading />;
      return (
        <>
          {children}
          {isDev && (
            <SettingDrawer
              disableUrlParams
              enableDarkTheme
              settings={initialState?.settings}
              onSettingChange={(settings) => {
                setInitialState((preInitialState) => ({
                  ...preInitialState,
                  settings,
                }));
              }}
            />
          )}
        </>
      );
    },
    ...initialState?.settings,
  };
};

/**
 * @name request 配置，可以配置错误处理
 * 它基于 axios 和 ahooks 的 useRequest 提供了一套统一的网络请求和错误处理方案。
 * @doc https://umijs.org/docs/max/request#配置
 */
export const request = {
  ...errorConfig,
};
