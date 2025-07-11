import express from 'express';
import rateLimit from 'express-rate-limit';
import { logError, logInfo } from '@/utils/logger';

// IP白名单（可以从环境变量或配置文件读取）
const IP_WHITELIST = process.env.IP_WHITELIST?.split(',') || [];

// 可疑活动检测
interface SuspiciousActivity {
  ip: string;
  userAgent: string;
  attempts: number;
  lastAttempt: Date;
  blocked: boolean;
}

const suspiciousActivities = new Map<string, SuspiciousActivity>();

// 通用速率限制
export const generalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 限制每个IP 15分钟内最多100个请求
  message: {
    success: false,
    message: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logError('Rate limit exceeded', new Error('Rate limit exceeded'), {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      url: req.originalUrl,
    });
    res.status(429).json({
      success: false,
      message: '请求过于频繁，请稍后再试',
      code: 'RATE_LIMIT_EXCEEDED',
    });
  },
});

// 登录速率限制
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 5, // 限制每个IP 15分钟内最多5次登录尝试
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: '登录尝试过于频繁，请15分钟后再试',
    code: 'LOGIN_RATE_LIMIT_EXCEEDED',
  },
  handler: (req, res) => {
    logError('Login rate limit exceeded', new Error('Login rate limit exceeded'), {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      email: req.body?.email,
    });
    res.status(429).json({
      success: false,
      message: '登录尝试过于频繁，请15分钟后再试',
      code: 'LOGIN_RATE_LIMIT_EXCEEDED',
    });
  },
});

// API速率限制
export const apiRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1分钟
  max: 60, // 限制每个IP 1分钟内最多60个API请求
  message: {
    success: false,
    message: 'API请求过于频繁，请稍后再试',
    code: 'API_RATE_LIMIT_EXCEEDED',
  },
});

// IP白名单检查中间件
export const ipWhitelistMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  // 如果没有配置白名单，则跳过检查
  if (IP_WHITELIST.length === 0) {
    return next();
  }

  // 检查IP是否在白名单中
  if (IP_WHITELIST.includes(clientIP)) {
    return next();
  }

  logError('IP not in whitelist', new Error('IP not in whitelist'), {
    ip: clientIP,
    userAgent: req.get('User-Agent'),
    url: req.originalUrl,
  });

  res.status(403).json({
    success: false,
    message: '访问被拒绝',
    code: 'IP_NOT_ALLOWED',
  });
};

// 可疑活动检测中间件
export const suspiciousActivityMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const clientIP = req.ip;
  const userAgent = req.get('User-Agent') || '';
  const key = `${clientIP}:${userAgent}`;

  // 检查是否已被阻止
  const activity = suspiciousActivities.get(key);
  if (activity && activity.blocked) {
    const timeSinceBlock = Date.now() - activity.lastAttempt.getTime();
    const blockDuration = 60 * 60 * 1000; // 1小时

    if (timeSinceBlock < blockDuration) {
      logError('Blocked IP attempted access', new Error('Blocked IP attempted access'), {
        ip: clientIP,
        userAgent,
        url: req.originalUrl,
      });

      return res.status(403).json({
        success: false,
        message: '您的访问已被暂时阻止',
        code: 'IP_BLOCKED',
      });
    } else {
      // 解除阻止
      suspiciousActivities.delete(key);
    }
  }

  // 检测可疑模式
  const isSuspicious = detectSuspiciousPatterns(req);
  if (isSuspicious) {
    updateSuspiciousActivity(key, clientIP, userAgent);
  }

  next();
};

// 检测可疑模式
const detectSuspiciousPatterns = (req: express.Request): boolean => {
  const userAgent = req.get('User-Agent') || '';
  const url = req.originalUrl;

  // 检测常见的攻击模式
  const suspiciousPatterns = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zap/i,
    /burp/i,
    /\.\.\/\.\.\//,
    /<script/i,
    /union.*select/i,
    /drop.*table/i,
    /exec.*xp_/i,
  ];

  // 检查User-Agent
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(userAgent) || pattern.test(url)) {
      return true;
    }
  }

  // 检查请求频率
  const clientIP = req.ip;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1分钟
  const maxRequests = 100;

  // 这里可以实现更复杂的频率检测逻辑

  return false;
};

// 更新可疑活动记录
const updateSuspiciousActivity = (key: string, ip: string, userAgent: string) => {
  const activity = suspiciousActivities.get(key) || {
    ip,
    userAgent,
    attempts: 0,
    lastAttempt: new Date(),
    blocked: false,
  };

  activity.attempts++;
  activity.lastAttempt = new Date();

  // 如果尝试次数超过阈值，则阻止该IP
  if (activity.attempts >= 10) {
    activity.blocked = true;
    logError('IP blocked due to suspicious activity', new Error('IP blocked'), {
      ip,
      userAgent,
      attempts: activity.attempts,
    });
  }

  suspiciousActivities.set(key, activity);
};

// 请求大小限制中间件
export const requestSizeLimitMiddleware = (maxSize: number = 10 * 1024 * 1024) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const contentLength = parseInt(req.get('Content-Length') || '0');
    
    if (contentLength > maxSize) {
      logError('Request size too large', new Error('Request size too large'), {
        ip: req.ip,
        contentLength,
        maxSize,
        url: req.originalUrl,
      });

      return res.status(413).json({
        success: false,
        message: '请求数据过大',
        code: 'REQUEST_TOO_LARGE',
      });
    }

    next();
  };
};

// SQL注入检测中间件
export const sqlInjectionDetectionMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const sqlInjectionPatterns = [
    /(\%27)|(\')|(\-\-)|(\%23)|(#)/i,
    /((\%3D)|(=))[^\n]*((\%27)|(\')|(\-\-)|(\%3B)|(;))/i,
    /\w*((\%27)|(\'))((\%6F)|o|(\%4F))((\%72)|r|(\%52))/i,
    /((\%27)|(\'))union/i,
    /exec(\s|\+)+(s|x)p\w+/i,
    /union.*select.*from/i,
    /select.*from.*where/i,
    /insert.*into.*values/i,
    /delete.*from.*where/i,
    /update.*set.*where/i,
    /drop.*table/i,
    /create.*table/i,
    /alter.*table/i,
  ];

  const checkForSQLInjection = (value: string): boolean => {
    return sqlInjectionPatterns.some(pattern => pattern.test(value));
  };

  const checkObject = (obj: any): boolean => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        if (checkForSQLInjection(obj[key])) {
          return true;
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (checkObject(obj[key])) {
          return true;
        }
      }
    }
    return false;
  };

  // 检查查询参数
  if (checkObject(req.query)) {
    logError('SQL injection attempt detected in query', new Error('SQL injection attempt'), {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      query: req.query,
      url: req.originalUrl,
    });

    return res.status(400).json({
      success: false,
      message: '请求包含非法字符',
      code: 'INVALID_REQUEST',
    });
  }

  // 检查请求体
  if (req.body && checkObject(req.body)) {
    logError('SQL injection attempt detected in body', new Error('SQL injection attempt'), {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      body: req.body,
      url: req.originalUrl,
    });

    return res.status(400).json({
      success: false,
      message: '请求包含非法字符',
      code: 'INVALID_REQUEST',
    });
  }

  next();
};

// XSS检测中间件
export const xssDetectionMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<img[^>]+src[^>]*>/gi,
    /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
    /<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi,
  ];

  const checkForXSS = (value: string): boolean => {
    return xssPatterns.some(pattern => pattern.test(value));
  };

  const checkObject = (obj: any): boolean => {
    for (const key in obj) {
      if (typeof obj[key] === 'string') {
        if (checkForXSS(obj[key])) {
          return true;
        }
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        if (checkObject(obj[key])) {
          return true;
        }
      }
    }
    return false;
  };

  // 检查查询参数和请求体
  if (checkObject(req.query) || (req.body && checkObject(req.body))) {
    logError('XSS attempt detected', new Error('XSS attempt'), {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      query: req.query,
      body: req.body,
      url: req.originalUrl,
    });

    return res.status(400).json({
      success: false,
      message: '请求包含非法脚本',
      code: 'XSS_DETECTED',
    });
  }

  next();
};

// 获取安全统计信息
export const getSecurityStats = () => {
  const blockedIPs = Array.from(suspiciousActivities.values()).filter(activity => activity.blocked);
  const suspiciousIPs = Array.from(suspiciousActivities.values()).filter(activity => !activity.blocked && activity.attempts > 5);

  return {
    blockedIPs: blockedIPs.length,
    suspiciousIPs: suspiciousIPs.length,
    totalSuspiciousActivities: suspiciousActivities.size,
    recentBlocks: blockedIPs.slice(-10).map(activity => ({
      ip: activity.ip,
      attempts: activity.attempts,
      lastAttempt: activity.lastAttempt,
    })),
  };
};

// 清理过期的可疑活动记录
export const cleanupSuspiciousActivities = () => {
  const now = Date.now();
  const cleanupThreshold = 24 * 60 * 60 * 1000; // 24小时

  for (const [key, activity] of suspiciousActivities.entries()) {
    const timeSinceLastAttempt = now - activity.lastAttempt.getTime();
    if (timeSinceLastAttempt > cleanupThreshold) {
      suspiciousActivities.delete(key);
    }
  }
};

// 启动安全监控定时任务
export const startSecurityMonitoring = () => {
  // 每小时清理一次过期记录
  setInterval(cleanupSuspiciousActivities, 60 * 60 * 1000);
  
  logInfo('Security monitoring started');
};
