import axios from 'axios'
import { ElMessage } from 'element-plus'
import { getEnvs } from './envs'
import router from '/@/router'
import { useUserStore, useAppStore } from '/@/store'
import { GLOBAL_DATA } from '/@/config/constant'
import Queue from './queue'
import Cookie from './cookie'
import JWT from './jwt'

export const TOKEN_CONST = Object.freeze({
  ACCESS_HEADER_KEY: 'x-access-token',
  REFRESH_HEADER_KEY: 'x-refresh-token',
  LS_ACCESS_KEY: 'access_token',
  LS_REFRESH_KEY: 'refresh_token',
})

// 1. 取得 axios 基本設定
function getConfig() {
  const { envStr } = getEnvs()
  const baseURL = envStr === 'dev' ? '/api' : GLOBAL_DATA[envStr].baseUrl

  return {
    baseURL,
    timeout: 24 * 60 * 60 * 1000,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      currency: useAppStore().currency,
    },
  }
}

// 2. 更新 Token 到 Cookie
function updateToken(headers) {
  const access = headers[TOKEN_CONST.ACCESS_HEADER_KEY]
  const refresh = headers[TOKEN_CONST.REFRESH_HEADER_KEY]
  if (access && refresh) {
    const exp = JWT.getExpiration(refresh)
    Cookie.setSession(TOKEN_CONST.LS_ACCESS_KEY, access)
    Cookie.set(TOKEN_CONST.LS_REFRESH_KEY, refresh, { expires: exp })
    console.log('更新 token:', { access, refresh })
  }
}

// 3. 刷新 Access Token
function refreshAccessToken() {
  const opts = getConfig()
  opts.headers[TOKEN_CONST.REFRESH_HEADER_KEY] = Cookie.get(TOKEN_CONST.LS_REFRESH_KEY)
  opts.headers[TOKEN_CONST.ACCESS_HEADER_KEY] = Cookie.get(TOKEN_CONST.LS_ACCESS_KEY)
  return axios.post('/api/refresh', {}, opts)
}

// 4. 處理 401：排隊並等待刷新完成後重試
function create401Handler() {
  const queue = new Queue()
  let isRefreshing = false

  return async (error, instance) => {
    const { config } = error
    // 把失敗的請求包到佇列
    queue.enqueue({ config, resolve: null, reject: null })
    return new Promise((resolve, reject) => {
      queue.enqueue({ config, resolve, reject })
      if (!isRefreshing) {
        isRefreshing = true
        refreshAccessToken()
          .then((res) => {
            updateToken(res.headers)
            // 重試所有排隊請求
            queue.toArray().forEach((task) => {
              instance.request(task.config).then(task.resolve).catch(task.reject)
            })
          })
          .catch((err) => {
            queue.toArray().forEach((task) => task.reject(err))
            if (err.response?.status === 401) {
              Cookie.clear()
              useUserStore().RESET_INFO()
              router.push('/login')
              ElMessage.error('登入已失效，請重新登入')
            }
          })
          .finally(() => {
            queue.clear()
            isRefreshing = false
          })
      }
    })
  }
}

// 5. 附加攔截器
function attachInterceptors(instance) {
  const handle401 = create401Handler()

  instance.interceptors.request.use((cfg) => {
    const token = Cookie.get(TOKEN_CONST.LS_ACCESS_KEY)
    if (token) cfg.headers[TOKEN_CONST.ACCESS_HEADER_KEY] = token
    if (!navigator.onLine) {
      ElMessage.error('請檢查您的網路是否正常')
      return Promise.reject(new Error('NETWORK_OFFLINE'))
    }
    console.log('發起請求:', cfg.url)
    return cfg
  })

  instance.interceptors.response.use(
    (res) => {
      updateToken(res.headers)
      // Blob / ArrayBuffer 直接回傳原 response
      const t = Object.prototype.toString.call(res.data)
      return t === '[object Blob]' || t === '[object ArrayBuffer]' ? res : res.data
    },
    (error) => {
      const status = error.response?.status
      if (status === 401) return handle401(error, instance)
      if (status === 429) return ElMessage.error('操作過於頻繁，請稍候重試')
      if (status === 500) return ElMessage.error('Server 錯誤，請稍後再試')
      if (error.message.includes('timeout')) return ElMessage.error('網路請求逾時，請稍後再試')
      // Blob 形式錯誤訊息
      if (error.response?.data instanceof Blob) {
        return error.response.data.text().then((txt) => {
          const json = JSON.parse(txt)
          ElMessage.error(json.msg || json.message)
        })
      }
      return Promise.reject(error.response?.data || error)
    },
  )
}

// 6. 主請求函式
export function request(options) {
  const instance = axios.create(getConfig())
  attachInterceptors(instance)

  // 組裝 params/data
  const { method, data, ...rest } = options
  const cfg = {
    method,
    ...rest,
    ...(['get', 'delete'].includes(method) ? { params: data } : { data }),
  }
  return instance.request(cfg)
}

const http = { request }
export default http
