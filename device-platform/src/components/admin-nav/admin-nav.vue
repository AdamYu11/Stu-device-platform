<template>
  <view class="admin-nav">
    <text class="nav-link" :class="{ 'nav-active': current === 'projects' }" @click="go('/pages/admin/projects/projects', 'projects')">测试数据管理</text>
    <text class="nav-link" :class="{ 'nav-active': current === 'device' }" @click="go('/pages/admin/devices/devices', 'device')">手机参数管理</text>
    <text class="nav-link" :class="{ 'nav-active': current === 'brands' }" @click="go('/pages/admin/brands/brands', 'brands')">品牌 Logo</text>
    <text class="nav-link nav-util" @click="doExport">导出数据</text>
    <text class="nav-link nav-util" @click="doImport">导入数据</text>
    <text class="nav-user" v-if="username">👤 {{ username }}</text>
    <text class="nav-link nav-util" @click="openPwd">修改密码</text>
    <text class="nav-link nav-front" @click="goFront" title="按 V 键快速返回前台">👁 查看前台</text>
    <text class="nav-link nav-back" @click="doLogout">退出登录</text>
  </view>

  <amodal :show="showPwd" title="修改密码" @confirm="submitPwd" @cancel="showPwd = false">
    <view class="field">
      <text class="field-label">原密码</text>
      <input class="field-input" type="password" v-model="pwdForm.oldPassword" placeholder-class="ph" />
    </view>
    <view class="field">
      <text class="field-label">新密码（至少 6 位）</text>
      <input class="field-input" type="password" v-model="pwdForm.newPassword" placeholder-class="ph" />
    </view>
    <view class="field">
      <text class="field-label">确认新密码</text>
      <input class="field-input" type="password" v-model="pwdForm.confirm" placeholder-class="ph" />
    </view>
  </amodal>
</template>

<script>
import { adminExportData, adminImportData, adminLogout, adminChangePassword } from '@/api/admin'

export default {
  name: 'admin-nav',
  props: {
    current: { type: String, default: '' },
  },
  data() {
    return {
      username: uni.getStorageSync('admin_username') || '',
      showPwd: false,
      pwdForm: { oldPassword: '', newPassword: '', confirm: '' },
    }
  },
  // #ifdef H5
  mounted() {
    document.addEventListener('keydown', this.onKeyDown)
  },
  beforeUnmount() {
    document.removeEventListener('keydown', this.onKeyDown)
  },
  // #endif
  methods: {
    go(url, key) {
      if (key === this.current) return
      uni.redirectTo({ url })
    },
    // 按 V 键快速回到前台预览（输入框内不触发）
    onKeyDown(e) {
      const el = e.target
      const tag = (el && el.tagName) || ''
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (el && el.isContentEditable)) return
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault()
        this.goFront()
      }
    },
    goFront() {
      uni.reLaunch({ url: '/pages/index/index' })
    },
    doExport() {
      uni.showLoading({ title: '导出中...' })
      adminExportData()
        .then((data) => {
          uni.hideLoading()
          const json = JSON.stringify(data, null, 2)
          const blob = new Blob([json], { type: 'application/json' })
          const a = document.createElement('a')
          const date = new Date().toISOString().slice(0, 10)
          a.href = URL.createObjectURL(blob)
          a.download = `device-data-${date}.json`
          a.click()
          URL.revokeObjectURL(a.href)
          uni.showToast({ title: '已导出', icon: 'success' })
        })
        .catch((err) => {
          uni.hideLoading()
          uni.showToast({ title: err.message || '导出失败', icon: 'none' })
        })
    },
    doImport() {
      uni.chooseFile({
        count: 1,
        extension: ['.json'],
        success: (res) => {
          const filePath = res.tempFilePaths && res.tempFilePaths[0]
          if (!filePath) return
          uni.showModal({
            title: '导入确认',
            content: '导入将覆盖当前全部数据（设备/参数/测试项目/测试结果），确定继续吗？',
            confirmText: '导入',
            cancelText: '取消',
            confirmColor: '#ef4444',
            success: (r) => {
              if (!r.confirm) return
              uni.showLoading({ title: '导入中...' })
              adminImportData(filePath)
                .then((d) => {
                  uni.hideLoading()
                  uni.showToast({ title: `导入成功：${d.devices} 台设备、${d.projects} 个测试项目`, icon: 'none', duration: 2500 })
                  setTimeout(() => uni.reLaunch({ url: '/pages/admin/projects/projects' }), 1200)
                })
                .catch((err) => {
                  uni.hideLoading()
                  uni.showToast({ title: err.message || '导入失败', icon: 'none' })
                })
            },
          })
        },
      })
    },
    openPwd() {
      this.pwdForm = { oldPassword: '', newPassword: '', confirm: '' }
      this.showPwd = true
    },
    submitPwd() {
      const f = this.pwdForm
      if (!f.oldPassword || !f.newPassword) {
        uni.showToast({ title: '请填写完整', icon: 'none' })
        return
      }
      if (f.newPassword.length < 6) {
        uni.showToast({ title: '新密码至少 6 位', icon: 'none' })
        return
      }
      if (f.newPassword !== f.confirm) {
        uni.showToast({ title: '两次输入的新密码不一致', icon: 'none' })
        return
      }
      adminChangePassword(f.oldPassword, f.newPassword)
        .then(() => {
          this.showPwd = false
          uni.showToast({ title: '密码已修改', icon: 'success' })
        })
        .catch((err) => uni.showToast({ title: err.message || '修改失败', icon: 'none' }))
    },
    doLogout() {
      adminLogout()
        .catch(() => {})
        .finally(() => {
          uni.removeStorageSync('admin_token')
          uni.removeStorageSync('admin_username')
          uni.reLaunch({ url: '/pages/admin/login/login' })
        })
    },
  },
}
</script>

<style>
.admin-nav {
  display: flex;
  align-items: center;
  margin-left: 40rpx;
  flex-wrap: wrap;
}
.nav-link {
  font-size: 28rpx;
  color: #9aa3b2;
  padding: 10rpx 28rpx;
  border-radius: 999rpx;
  cursor: pointer;
  margin-right: 12rpx;
}
.nav-link:hover {
  background-color: rgba(31, 36, 46, 0.65);
}
.nav-active {
  color: #5cb3ff;
  background-color: rgba(31, 36, 46, 0.65);
  font-weight: 600;
}
.nav-util {
  border: 1px dashed #2c3342;
}
.nav-user {
  font-size: 26rpx;
  color: #c3c9d6;
  margin-right: 12rpx;
}
.nav-back {
  color: #ef4444;
  border: 1px solid #ef4444;
}
.nav-front {
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.45);
}
.nav-front:hover {
  background-color: rgba(74, 222, 128, 0.12);
}
</style>
