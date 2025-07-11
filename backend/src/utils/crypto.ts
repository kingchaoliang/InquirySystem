import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';

/**
 * 密码加密工具
 */
export class CryptoUtils {
  /**
   * 加密密码
   * @param password 原始密码
   * @returns 加密后的密码哈希
   */
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * 验证密码
   * @param password 原始密码
   * @param hashedPassword 加密后的密码哈希
   * @returns 是否匹配
   */
  static async verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  /**
   * 生成JWT token
   * @param payload token载荷
   * @param expiresIn 过期时间
   * @returns JWT token
   */
  static generateToken(payload: object, expiresIn: string = '7d'): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    return jwt.sign(payload, secret, { expiresIn });
  }

  /**
   * 验证JWT token
   * @param token JWT token
   * @returns 解码后的载荷
   */
  static verifyToken(token: string): any {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set');
    }
    return jwt.verify(token, secret);
  }

  /**
   * 生成随机字符串
   * @param length 字符串长度
   * @returns 随机字符串
   */
  static generateRandomString(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  /**
   * 生成询盘编号
   * @returns 询盘编号
   */
  static generateInquiryNo(): string {
    const timestamp = Date.now().toString();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `INQ${timestamp.slice(-8)}${random}`;
  }

  /**
   * 加密敏感数据
   * @param text 要加密的文本
   * @param key 加密密钥
   * @returns 加密后的数据
   */
  static encrypt(text: string, key?: string): string {
    const algorithm = 'aes-256-cbc';
    const secretKey = key || process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(algorithm, secretKey);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return iv.toString('hex') + ':' + encrypted;
  }

  /**
   * 解密敏感数据
   * @param encryptedText 加密的文本
   * @param key 解密密钥
   * @returns 解密后的数据
   */
  static decrypt(encryptedText: string, key?: string): string {
    const algorithm = 'aes-256-cbc';
    const secretKey = key || process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production';
    const textParts = encryptedText.split(':');
    const iv = Buffer.from(textParts.shift()!, 'hex');
    const encryptedData = textParts.join(':');
    const decipher = crypto.createDecipher(algorithm, secretKey);
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }
}
