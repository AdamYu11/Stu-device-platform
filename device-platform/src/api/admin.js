/**
 * 管理后台专用 API（仅 H5 端使用，始终请求真实后端，不走 mock）
 */
import { BASE_URL } from './config'

function getToken() {
  return uni.getStorageSync('admin_token') || ''
}

function toLogin() {
  uni.removeStorageSync('admin_token')
  uni.removeStorageSync('admin_username')
  uni.reLaunch({ url: '/pages/admin/login/login' })
}

function request(method, url, data) {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method,
      data,
      header: { 'Content-Type': 'application/json', Authorization: getToken() ? 'Bearer ' + getToken() : '' },
      timeout: 10000,
      success: (res) => {
        if (res.statusCode === 401 || (res.data && res.data.code === 401)) {
          toLogin()
          reject(new Error('登录已失效，请重新登录'))
          return
        }
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

// ===== 登录鉴权 =====
// 管理页面进入前调用：未登录则跳转登录页
export function requireLogin() {
  if (!getToken()) {
    toLogin()
    return false
  }
  return true
}

export const adminLogin = (username, password) => request('POST', '/api/auth/login', { username, password })
export const adminLogout = () => request('POST', '/api/auth/logout')
export const adminChangePassword = (oldPassword, newPassword) =>
  request('POST', '/api/auth/password', { oldPassword, newPassword })

// ===== 测试项目（测试名称） =====
export const adminGetProjects = () => request('GET', '/api/projects')
export const adminGetProject = (id) => request('GET', `/api/projects/${id}`)
export const adminCreateProject = (data) => request('POST', '/api/projects', data)
export const adminUpdateProject = (id, data) => request('PUT', `/api/projects/${id}`, data)
export const adminDeleteProject = (id) => request('DELETE', `/api/projects/${id}`)

// 测试项目下的机型测试记录
export const adminCreateRecord = (projectId, data) => request('POST', `/api/projects/${projectId}/records`, data)
export const adminUpdateRecord = (id, data) => request('PUT', `/api/projects/records/${id}`, data)
export const adminDeleteRecord = (id) => request('DELETE', `/api/projects/records/${id}`)

// ===== 手机参数（多设备） =====
export const adminGetDevices = () => request('GET', '/api/devices')
export const adminCreateDevice = (data) => request('POST', '/api/devices', data)
export const adminUpdateDevice = (id, data) => request('PUT', `/api/devices/${id}`, data)
export const adminDeleteDevice = (id) => request('DELETE', `/api/devices/${id}`)
export const adminGetDeviceInfo = (id) => request('GET', `/api/devices/${id}/info`)
export const adminSaveDeviceInfo = (id, data) => request('PUT', `/api/devices/${id}/info`, data)

// 品牌 Logo
export const adminGetBrands = () => request('GET', '/api/brands')
export const adminSaveBrandImage = (name, image) => request('PUT', '/api/brands/image', { name, image })

// 上传缩略图（H5：uni.chooseImage 选中的临时路径）
export const adminUploadImage = (filePath) =>
  new Promise((resolve, reject) => {
    uni.uploadFile({
      url: BASE_URL + '/api/upload',
      filePath,
      name: 'file',
      header: { Authorization: getToken() ? 'Bearer ' + getToken() : '' },
      success: (res) => {
        try {
          const d = JSON.parse(res.data)
          if (d.code === 401) {
            toLogin()
            reject(new Error('登录已失效，请重新登录'))
          } else if (d.code === 0) resolve(d.data.url)
          else reject(new Error(d.message || '上传失败'))
        } catch (e) {
          reject(new Error('上传失败'))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '上传失败')),
    })
  })

// 导出全部数据
export const adminExportData = () => request('GET', '/api/export')

// 导入数据文件（filePath 为 uni.chooseFile 选中的文件路径）
export const adminImportData = (filePath) =>
  new Promise((resolve, reject) => {
    uni.uploadFile({
      url: BASE_URL + '/api/import',
      filePath,
      name: 'file',
      header: { Authorization: getToken() ? 'Bearer ' + getToken() : '' },
      success: (res) => {
        try {
          const d = JSON.parse(res.data)
          if (d.code === 401) {
            toLogin()
            reject(new Error('登录已失效，请重新登录'))
          } else if (d.code === 0) resolve(d.data)
          else reject(new Error(d.message || '导入失败'))
        } catch (e) {
          reject(new Error('导入失败'))
        }
      },
      fail: (err) => reject(new Error(err.errMsg || '导入失败')),
    })
  })
