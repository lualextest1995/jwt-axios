import Cookies from 'js-cookie'

/**
 * Cookie 操作工具類
 */
class CookieUtil {
  /**
   * 設置 cookie (Create/Update)
   * @param {string} name - cookie 名稱
   * @param {any} value - cookie 值
   * @param {object} options - 配置選項
   * @returns {string|undefined} 設置的 cookie 值
   */
  static set(name, value, options = {}) {
    try {
      // 預設配置
      const defaultOptions = {
        expires: 7, // 7天過期
        path: '/',
        secure: window.location.protocol === 'https:', // HTTPS 環境下自動啟用 secure
        sameSite: 'lax'
      }

      const finalOptions = { ...defaultOptions, ...options }

      // 如果值是對象，轉為 JSON 字符串
      const cookieValue = typeof value === 'object' ? JSON.stringify(value) : value

      return Cookies.set(name, cookieValue, finalOptions)
    } catch (error) {
      console.error('設置 cookie 失敗:', error)
      return undefined
    }
  }

  /**
   * 獲取 cookie (Read)
   * @param {string} name - cookie 名稱
   * @param {boolean} isJson - 是否嘗試解析為 JSON
   * @returns {any} cookie 值
   */
  static get(name, isJson = false) {
    try {
      const value = Cookies.get(name)

      if (value === undefined) {
        return undefined
      }

      // 如果指定解析為 JSON
      if (isJson) {
        try {
          return JSON.parse(value)
        } catch (parseError) {
          console.warn('JSON 解析失敗，返回原始值:', parseError)
          return value
        }
      }

      return value
    } catch (error) {
      console.error('獲取 cookie 失敗:', error)
      return undefined
    }
  }

  /**
   * 獲取所有 cookies
   * @returns {object} 所有 cookie 的鍵值對
   */
  static getAll() {
    try {
      return Cookies.get()
    } catch (error) {
      console.error('獲取所有 cookies 失敗:', error)
      return {}
    }
  }

  /**
   * 刪除 cookie (Delete)
   * @param {string} name - cookie 名稱
   * @param {object} options - 刪除選項（需要與設置時的 path、domain 等保持一致）
   * @returns {boolean} 是否刪除成功
   */
  static remove(name, options = {}) {
    try {
      const defaultOptions = {
        path: '/'
      }

      const finalOptions = { ...defaultOptions, ...options }

      Cookies.remove(name, finalOptions)

      // 驗證是否真的被刪除
      return Cookies.get(name) === undefined
    } catch (error) {
      console.error('刪除 cookie 失敗:', error)
      return false
    }
  }

  /**
   * 檢查 cookie 是否存在
   * @param {string} name - cookie 名稱
   * @returns {boolean} 是否存在
   */
  static exists(name) {
    return Cookies.get(name) !== undefined
  }

  /**
   * 清除所有 cookies
   * @param {array} excludes - 排除的 cookie 名稱列表
   * @returns {number} 清除的數量
   */
  static clear(excludes = []) {
    try {
      const allCookies = Cookies.get()
      let clearedCount = 0

      Object.keys(allCookies).forEach(name => {
        if (!excludes.includes(name)) {
          if (CookieUtil.remove(name)) {
            clearedCount++
          }
        }
      })

      return clearedCount
    } catch (error) {
      console.error('清除 cookies 失敗:', error)
      return 0
    }
  }

  /**
   * 設置帶過期時間的 cookie（分鐘為單位）
   * @param {string} name - cookie 名稱
   * @param {any} value - cookie 值
   * @param {number} minutes - 過期時間（分鐘）
   * @returns {string|undefined} 設置的 cookie 值
   */
  static setWithMinutes(name, value, minutes) {
    const expires = new Date(Date.now() + minutes * 60 * 1000)
    return CookieUtil.set(name, value, { expires })
  }

  /**
   * 設置帶過期時間的 cookie（小時為單位）
   * @param {string} name - cookie 名稱
   * @param {any} value - cookie 值
   * @param {number} hours - 過期時間（小時）
   * @returns {string|undefined} 設置的 cookie 值
   */
  static setWithHours(name, value, hours) {
    const expires = new Date(Date.now() + hours * 60 * 60 * 1000)
    return CookieUtil.set(name, value, { expires })
  }

  /**
   * 設置會話 cookie（瀏覽器關閉時過期）
   * @param {string} name - cookie 名稱
   * @param {any} value - cookie 值
   * @returns {string|undefined} 設置的 cookie 值
   */
  static setSession(name, value) {
    return CookieUtil.set(name, value, { expires: undefined })
  }
}

// 導出 CookieUtil 類
export default CookieUtil

// 同時導出常用方法的簡化版本
export const setCookie = CookieUtil.set
export const getCookie = CookieUtil.get
export const removeCookie = CookieUtil.remove
export const clearCookies = CookieUtil.clear
