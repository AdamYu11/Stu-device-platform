/**
 * API 统一出口
 * 页面只依赖这里暴露的方法，全部请求真实后端
 */
import { BASE_URL } from './config'

function request(url, data = {}) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      data,
      method: 'GET',
      timeout: 10000,
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

// 首页：测试项目（测试名称）列表
export const getProjectList = () => request('/api/projects')

// 详情页：测试项目详情（含各机型记录 + 实时引用机型参数）
export const getProjectDetail = (id) => request(`/api/projects/${id}`)

// 手机参数页：设备列表
export const getDeviceList = () => request('/api/devices')

// 手机参数页：单台设备参数
export const getDeviceInfo = (id) => request(`/api/devices/${id}/info`)

// 品牌 Logo 列表 [{name, image}]
export const getBrands = () => request('/api/brands')

// 图片地址解析：相对路径补后端地址（H5/小程序均需完整 URL）
export const resolveImage = (url) => {
  if (!url) return ''
  return /^https?:\/\//.test(url) ? url : BASE_URL + url
}
