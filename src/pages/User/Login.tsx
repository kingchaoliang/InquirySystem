import { LockOutlined, UserOutlined } from '@ant-design/icons';
import { LoginForm, ProFormText } from '@ant-design/pro-components';
import { Alert, message, Tabs } from 'antd';
import React, { useState } from 'react';
import { history, useModel } from '@umijs/max';
import { login } from '@/services/ant-design-pro/api';
import styles from './Login.less';

type LoginType = 'account' | 'mobile';

const LoginMessage: React.FC<{
  content: string;
}> = ({ content }) => {
  return (
    <Alert
      style={{
        marginBottom: 24,
      }}
      message={content}
      type="error"
      showIcon
    />
  );
};

const Login: React.FC = () => {
  const [userLoginState, setUserLoginState] = useState<API.LoginResult>({});
  const [type, setType] = useState<LoginType>('account');
  const { initialState, setInitialState } = useModel('@@initialState');

  const fetchUserInfo = async () => {
    const userInfo = await initialState?.fetchUserInfo?.();
    if (userInfo) {
      await setInitialState((s) => ({
        ...s,
        currentUser: userInfo,
      }));
    }
  };

  const handleSubmit = async (values: API.LoginParams) => {
    try {
      // 登录
      const response = await login(values);

      if (response.success) {
        // 存储token
        localStorage.setItem('token', response.data.token);

        message.success(response.message || '登录成功！');

        await fetchUserInfo();
        const urlParams = new URL(window.location.href).searchParams;
        history.push(urlParams.get('redirect') || '/');
        return;
      } else {
        setUserLoginState({ status: 'error', type: 'account' });
        message.error(response.message || '登录失败');
      }
    } catch (error: any) {
      const defaultLoginFailureMessage = '登录失败，请重试！';
      console.error('登录错误:', error);
      setUserLoginState({ status: 'error', type: 'account' });
      message.error(error.message || defaultLoginFailureMessage);
    }
  };

  const { status, type: loginType } = userLoginState;

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <LoginForm
          logo={<img alt="logo" src="/logo.svg" />}
          title="AI询盘管理CRM系统"
          subTitle="智能询盘管理，提升销售效率"
          initialValues={{
            autoLogin: true,
          }}
          onFinish={async (values) => {
            await handleSubmit(values as API.LoginParams);
          }}
        >
          <Tabs
            activeKey={type}
            onChange={setType}
            centered
            items={[
              {
                key: 'account',
                label: '账户密码登录',
              },
            ]}
          />

          {status === 'error' && loginType === 'account' && (
            <LoginMessage content="账户或密码错误" />
          )}
          {type === 'account' && (
            <>
              <ProFormText
                name="email"
                fieldProps={{
                  size: 'large',
                  prefix: <UserOutlined className={styles.prefixIcon} />,
                }}
                placeholder="邮箱地址"
                rules={[
                  {
                    required: true,
                    message: '邮箱地址是必填项！',
                  },
                  {
                    type: 'email',
                    message: '请输入有效的邮箱地址！',
                  },
                ]}
              />
              <ProFormText.Password
                name="password"
                fieldProps={{
                  size: 'large',
                  prefix: <LockOutlined className={styles.prefixIcon} />,
                }}
                placeholder="密码"
                rules={[
                  {
                    required: true,
                    message: '密码是必填项！',
                  },
                ]}
              />
            </>
          )}

          <div
            style={{
              marginBottom: 24,
            }}
          >
            {/* 可以添加记住密码、忘记密码等功能 */}
          </div>
        </LoginForm>
      </div>
    </div>
  );
};

export default Login;
