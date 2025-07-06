import axios from 'axios'
import Queue from './queue'
import Cookie from './cookie'
import JWT from './jwt'
import router from '@/router'
import { ElMessage } from 'element-plus'
import { getEnvs } from './envs'
import { useUserStore, useAppStore } from '/@/store'
import { GLOBAL_DATA } from '/@/config/constant'

export const TOKEN_CONST = Object.freeze({
  ACCESS_HEADER_KEY: 'x-access-token',
  REFRESH_HEADER_KEY: 'x-refresh-token',
  LS_ACCESS_KEY: 'access_token',
  LS_REFRESH_KEY: 'refresh_token',
})

const queue = new Queue()
let isRefreshing = false

const instance = axios.create()

// request
instance.interceptors.request.use(
  (config) => {
    console.log('發起請求:', config.url)
    const accessToken = Cookie.get(TOKEN_CONST.LS_ACCESS_KEY)

    // 如果有 accessToken，則放入 header
    if (accessToken) {
      config.headers[TOKEN_CONST.ACCESS_HEADER_KEY] = accessToken
    }

    // 網路斷線提示
    if (!navigator.onLine) {
      ElMessage.error('請檢查您的網路是否正常')
      return Promise.reject(new Error('NETWORK_OFFLINE'))
    }

    return config
  },
  (err) => Promise.reject(err),
)

// response
instance.interceptors.response.use(
  async (res) => {
    // 從回應頭取新 Token
    updateToken(res)

    // Blob / ArrayBuffer 直接吐回去
    const type = Object.prototype.toString.call(res.data)
    if (type === '[object Blob]' || type === '[object ArrayBuffer]') {
      return res
    }

    return res.data
  },
  async (error) => {
    const { response, message, config } = error

    // 401
    if (response && response.status === 401) {
      return HandlerBy401(config)
    }

    // 429
    if (response && response.status === 429) {
      ElMessage.error('操作過於頻繁，請稍候重試')
      return
    }

    // 500
    if (response && response.status === 500) {
      ElMessage.error('Server 錯誤，請稍後再試')
      return
    }

    // Blob 形式錯誤訊息
    if (response?.data instanceof Blob) {
      const responseData = await error.response.data?.text()
      const responseJson =
        typeof responseData === 'string' ? JSON.parse(responseData) : responseData
      ElMessage.error(responseJson.msg ?? responseJson.message)
      return
    }

    // timeout
    if (message.includes('timeout')) {
      ElMessage.error('網路請求逾時，請稍後再試')
      return
    }

    return Promise.reject(response?.data ?? error)
  },
)

function getConfig() {
  const appStore = useAppStore()
  const { envStr } = getEnvs()
  const baseURL = envStr === 'dev' ? '/api' : GLOBAL_DATA[envStr].baseUrl
  return {
    baseURL,
    timeout: 24 * 60 * 60 * 1000, // 24h
    withCredentials: false,
    headers: {
      'Content-Type': 'application/json;charset=UTF-8',
      currency: appStore.currency,
    },
  }
}

function getParams({ method, data, ...rest }) {
  const payload = { method, ...rest }
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    payload.data = data
  } else {
    payload.params = data
  }
  return payload
}

function updateToken(response) {
  const access = response.headers[TOKEN_CONST.ACCESS_HEADER_KEY]
  const refresh = response.headers[TOKEN_CONST.REFRESH_HEADER_KEY]
  if (access && refresh) {
    const refreshExp = JWT.getExpiration(refresh)
    Cookie.setSession(TOKEN_CONST.LS_ACCESS_KEY, access)
    Cookie.set(TOKEN_CONST.LS_REFRESH_KEY, refresh, { expires: refreshExp })
    console.log('更新 token:', { access, refresh })
  }
}

async function refreshAccessToken() {
  const baseOpt = getConfig()
  baseOpt.headers[TOKEN_CONST.REFRESH_HEADER_KEY] = Cookie.get(TOKEN_CONST.LS_REFRESH_KEY)
  baseOpt.headers[TOKEN_CONST.ACCESS_HEADER_KEY] = Cookie.get(TOKEN_CONST.LS_ACCESS_KEY)
  const options = {
    method: 'post',
    url: '/api/refresh',
  }
  const params = { ...baseOpt, ...getParams(options) }
  return axios.request(params)
}

function HandlerBy401(config) {
  return new Promise((resolve, reject) => {
    // 把這個請求包成任務，先入佇列
    console.log('請求加入佇列:', config.url)
    queue.enqueue({ config, resolve, reject })
    if (!isRefreshing) {
      isRefreshing = true
      refreshAccessToken()
        .then((res) => {
          updateToken(res)
          // 一次把佇列裡的請求全部重試
          queue.toArray().forEach((task) => {
            console.log('處理佇列中的請求:', task.config.url)
            instance.request(task.config).then(task.resolve).catch(task.reject)
          })
        })
        .catch(async (err) => {
          // Refresh 失敗，整個佇列都 reject
          queue.toArray().forEach((task) => task.reject(err))
          // 如果是 refresh 自己也清除憑證
          if (err.status === 401) {
            Cookie.clear()
            const userStore = useUserStore()
            await userStore.RESET_INFO()
            router.push('/login')
            ElMessage.error('登入已失效，請重新登入')
            console.log('清空佇列與cookie：', {
              cookie: Cookie.getAll(),
              queue: queue.toArray(),
            })
          }
          return Promise.reject(err)
        })
        .finally(() => {
          queue.clear()
          isRefreshing = false
        })
    }
  })
}


function request(options) {
  const baseOpt = getConfig()
  const params = { ...baseOpt, ...getParams(options) }
  return instance.request(params)
}

export default {
  request,
}
