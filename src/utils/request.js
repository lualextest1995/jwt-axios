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
    console.log('response error:', error)
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
  if (!isRefreshing) {
    isRefreshing = true
    return refreshAccessToken()
      .then((res) => {
        updateToken(res)
        console.log('處理當前請求:', config.url)
        instance.request(config)
        queue.toArray().forEach((item) => {
          console.log('處理佇列中的請求:', item.config.url)
          instance.request(item.config).then(item.resolve).catch(item.reject)
        })
        return queue.clear() // 清空佇列
      })
      .catch((err) => {
        // 清空佇列與cookie
        if (err.status === 401) {
          console.log('清空佇列與cookie', err)
          queue.clear()
          Cookie.clear()
        }
        return Promise.reject(err)
      })
      .finally(() => {
        isRefreshing = false
      })
  }

  return new Promise((resolve, reject) => {
    console.log('將請求加入佇列:', config.url)
    queue.enqueue({ config, resolve, reject })
    console.log(
      '當前佇列:',
      queue.toArray().map((item) => item.config.url),
    )
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
