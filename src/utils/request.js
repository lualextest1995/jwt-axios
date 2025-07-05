import axios from 'axios'
import Queue from './queue'
import Cookie from './cookie'
import JWT from './jwt'

export const TOKEN_CONST = Object.freeze({
  ACCESS_HEADER_KEY: 'x-access-token',
  REFRESH_HEADER_KEY: 'x-refresh-token',
  LS_ACCESS_KEY: 'access_token',
  LS_REFRESH_KEY: 'refresh_token',
})

const queue = new Queue()

let isRefreshing = false

const instance = axios.create({
  baseURL: 'http://localhost:3000',
  timeout: 1000,
})

instance.interceptors.request.use(
  (config) => {
    console.log('request config:', config.url)
    const accessToken = Cookie.get(TOKEN_CONST.LS_ACCESS_KEY)
    if(accessToken){
      config.headers[TOKEN_CONST.ACCESS_HEADER_KEY] = accessToken
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

instance.interceptors.response.use(
  (response) => {
    updateToken(response)

    return response
  },
  (error) => {
    const { config, response } = error
    if (response && response.status === 401) {
      return HandlerBy401(config)
    }
    return Promise.reject(error)
  },
)

export default instance

async function refreshAccessToken() {
  return axios.post(
    '/api/refresh',
    {},
    {
      baseURL: 'http://localhost:3000',
      headers: {
        [TOKEN_CONST.REFRESH_HEADER_KEY]: Cookie.get(TOKEN_CONST.LS_REFRESH_KEY),
        [TOKEN_CONST.ACCESS_HEADER_KEY]: Cookie.get(TOKEN_CONST.LS_ACCESS_KEY),
      },
    },
  )
}

function HandlerBy401(config) {
  return new Promise((resolve, reject) => {
    // 把這個請求包成任務，先入佇列
    console.log('將請求加入佇列:', config.url)
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
        .catch((err) => {
          // Refresh 失敗，整個佇列都 reject
          queue.toArray().forEach((task) => task.reject(err))
          // 如果是 refresh 自己也清除憑證
          if (err.status === 401) {
            console.log('清空佇列與cookie', err)
            Cookie.clear()
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

function updateToken(response) {
  const access = response.headers[TOKEN_CONST.ACCESS_HEADER_KEY]
  const refresh = response.headers[TOKEN_CONST.REFRESH_HEADER_KEY]
  if (access && refresh) {
    console.log('更新權限了')
    const refreshExp = JWT.getExpiration(refresh)
    Cookie.setSession(TOKEN_CONST.LS_ACCESS_KEY, access)
    Cookie.set(TOKEN_CONST.LS_REFRESH_KEY, refresh, { expires: refreshExp })
  }
}
