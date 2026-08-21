/**
 * AI 助手 API
 */
import { BASE_URL } from './config'

export function aiChat(messages) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + '/api/ai/chat',
      method: 'POST',
      data: { messages },
      header: { 'Content-Type': 'application/json' },
      timeout: 60000, // 大模型响应较慢，区别于普通接口的 10s
      success: (res) => {
        if (res.statusCode === 200 && res.data && res.data.code === 0) {
          resolve(res.data.data)
        } else {
          reject(new Error((res.data && res.data.message) || `请求失败(${res.statusCode})`))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '网络请求失败')),
    })
  })
}
