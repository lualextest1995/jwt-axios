import { jwtDecode } from "jwt-decode";

/**
 * 封裝的 JWT 工具類
 */
class JWTUtils {
  /**
   * 解碼 JWT token
   * @param {string} token - JWT token
   * @returns {object|null} - 解碼後的 payload 或 null（如果失敗）
   */
  static decode(token) {
    try {
      if (!token) {
        throw new Error('Token is required');
      }
      return jwtDecode(token);
    } catch (error) {
      console.error('JWT decode error:', error);
      return null;
    }
  }

  /**
   * 獲取 token 的過期時間
   * @param {string} token - JWT token
   * @returns {Date|null} - 過期時間或 null（如果失敗）
   */
  static getExpiration(token) {
    const payload = JWTUtils.decode(token);
    if (!payload || !payload.exp) {
      return null;
    }
    return new Date(payload.exp * 1000);
  }

  /**
   * 檢查 token 是否過期
   * @param {string} token - JWT token
   * @returns {boolean} - true 表示已過期，false 表示未過期
   */
  static isExpired(token) {
    const expiration = JWTUtils.getExpiration(token);
    if (!expiration) {
      return true; // 如果無法獲取過期時間，視為已過期
    }
    return expiration < new Date();
  }

  /**
   * 檢查 token 是否即將過期（預設 5 分鐘內）
   * @param {string} token - JWT token
   * @param {number} minutes - 多少分鐘內算即將過期（預設 5 分鐘）
   * @returns {boolean} - true 表示即將過期
   */
  static isExpiringSoon(token, minutes = 5) {
    const expiration = JWTUtils.getExpiration(token);
    if (!expiration) {
      return true;
    }
    const warningTime = new Date(Date.now() + minutes * 60 * 1000);
    return expiration < warningTime;
  }

  /**
   * 獲取 token 的剩餘有效時間（毫秒）
   * @param {string} token - JWT token
   * @returns {number|null} - 剩餘時間（毫秒）或 null
   */
  static getTimeToExpiry(token) {
    const expiration = JWTUtils.getExpiration(token);
    if (!expiration) {
      return null;
    }
    const remaining = expiration.getTime() - Date.now();
    return remaining > 0 ? remaining : 0;
  }

  /**
   * 獲取 token 中的用戶 ID
   * @param {string} token - JWT token
   * @param {string} userIdField - 用戶 ID 欄位名稱（預設 'sub'）
   * @returns {string|null} - 用戶 ID 或 null
   */
  static getUserId(token, userIdField = 'sub') {
    const payload = JWTUtils.decode(token);
    return payload?.[userIdField] || null;
  }

  /**
   * 獲取 token 中的用戶角色
   * @param {string} token - JWT token
   * @param {string} roleField - 角色欄位名稱（預設 'role'）
   * @returns {string|array|null} - 用戶角色或 null
   */
  static getUserRole(token, roleField = 'role') {
    const payload = JWTUtils.decode(token);
    return payload?.[roleField] || null;
  }

  /**
   * 檢查用戶是否有特定角色
   * @param {string} token - JWT token
   * @param {string} requiredRole - 需要的角色
   * @param {string} roleField - 角色欄位名稱（預設 'role'）
   * @returns {boolean} - true 表示有該角色
   */
  static hasRole(token, requiredRole, roleField = 'role') {
    const roles = JWTUtils.getUserRole(token, roleField);
    if (!roles) return false;

    if (Array.isArray(roles)) {
      return roles.includes(requiredRole);
    }
    return roles === requiredRole;
  }

  /**
   * 獲取 token 的完整 payload
   * @param {string} token - JWT token
   * @returns {object|null} - payload 對象或 null
   */
  static getPayload(token) {
    return JWTUtils.decode(token);
  }

  /**
   * 檢查 token 是否有效（格式正確且未過期）
   * @param {string} token - JWT token
   * @returns {boolean} - true 表示有效
   */
  static isValid(token) {
    const payload = JWTUtils.decode(token);
    return payload !== null && !JWTUtils.isExpired(token);
  }
}

// 導出類和便利函數
export default JWTUtils;

// 導出便利函數，方便直接使用
export const decodeJWT = JWTUtils.decode;
export const isJWTExpired = JWTUtils.isExpired;
export const isJWTValid = JWTUtils.isValid;
export const getJWTExpiration = JWTUtils.getExpiration;
export const getJWTPayload = JWTUtils.getPayload;
export const getJWTUserId = JWTUtils.getUserId;
export const getJWTUserRole = JWTUtils.getUserRole;
export const hasJWTRole = JWTUtils.hasRole;
