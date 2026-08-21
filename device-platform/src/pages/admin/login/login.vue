<template>
  <view class="page">
    <view class="login-box">
      <view class="login-icon">📱</view>
      <text class="login-title">谦哥数码数据库 · 管理后台</text>
      <text class="login-sub">请登录后录入和管理数据</text>

      <view class="field">
        <text class="field-label">用户名</text>
        <input class="field-input" v-model="username" placeholder="请输入用户名" placeholder-class="ph" />
      </view>
      <view class="field">
        <text class="field-label">密码</text>
        <input class="field-input" type="password" v-model="password" placeholder="请输入密码" placeholder-class="ph" @confirm="doLogin" />
      </view>

      <view class="login-btn" hover-class="btn-hover" @click="doLogin">{{ loading ? '登录中...' : '登 录' }}</view>

      <view class="login-foot">
        <text class="foot-link" @click="goHome">← 返回前台</text>
      </view>
    </view>
  </view>
</template>

<script>
import { adminLogin } from '@/api/admin'

export default {
  data() {
    return {
      username: '',
      password: '',
      loading: false,
    }
  },
  onLoad() {
    // 已登录则直接进入管理页
    if (uni.getStorageSync('admin_token')) {
      uni.reLaunch({ url: '/pages/admin/projects/projects' })
    }
  },
  methods: {
    doLogin() {
      const username = this.username.trim()
      if (!username || !this.password) {
        uni.showToast({ title: '请输入用户名和密码', icon: 'none' })
        return
      }
      this.loading = true
      adminLogin(username, this.password)
        .then((data) => {
          uni.setStorageSync('admin_token', data.token)
          uni.setStorageSync('admin_username', data.username)
          uni.showToast({ title: '登录成功', icon: 'success' })
          setTimeout(() => uni.reLaunch({ url: '/pages/admin/projects/projects' }), 500)
        })
        .catch((err) => {
          uni.showToast({ title: err.message || '登录失败', icon: 'none' })
        })
        .finally(() => {
          this.loading = false
        })
    },
    goHome() {
      uni.reLaunch({ url: '/pages/index/index' })
    },
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: transparent;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
  box-sizing: border-box;
}
.login-box {
  width: 100%;
  max-width: 480px;
  background-color: rgba(24, 27, 34, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 24rpx;
  padding: 56rpx 48rpx;
  display: flex;
  flex-direction: column;
}
.login-icon {
  font-size: 72rpx;
  text-align: center;
}
.login-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #e6e8ee;
  text-align: center;
  margin-top: 20rpx;
}
.login-sub {
  font-size: 24rpx;
  color: #9aa3b2;
  text-align: center;
  margin: 10rpx 0 40rpx;
}
.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 28rpx;
}
.field-label {
  font-size: 24rpx;
  color: #9aa3b2;
  margin-bottom: 10rpx;
}
.field-input {
  background-color: rgba(15, 17, 21, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12rpx;
  padding: 18rpx 24rpx;
  font-size: 28rpx;
  color: #e6e8ee;
}
.ph {
  color: #7c8598;
}
.login-btn {
  text-align: center;
  padding: 20rpx 0;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #3d7ef5, #5cb3ff);
  color: #ffffff;
  font-size: 30rpx;
  font-weight: 600;
  cursor: pointer;
}
.btn-hover {
  opacity: 0.8;
}
.login-foot {
  display: flex;
  justify-content: center;
  margin-top: 32rpx;
}
.foot-link {
  font-size: 26rpx;
  color: #9aa3b2;
  cursor: pointer;
}
.foot-link:hover {
  color: #5cb3ff;
}
</style>
