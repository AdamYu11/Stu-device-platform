<template>
  <view class="page">
    <view class="a-header">
      <view class="a-head-left">
        <text class="a-title">手机参数管理</text>
        <admin-nav current="device"></admin-nav>
      </view>
      <view class="a-actions">
        <view class="a-btn" hover-class="btn-hover" @click="openCreate">＋ 添加设备</view>
      </view>
    </view>

    <view class="a-body">
      <view class="loading" v-if="loading">
        <view class="spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <view class="error" v-else-if="errorMsg">
        <text class="error-text">{{ errorMsg }}</text>
        <view class="retry-btn" hover-class="btn-hover" @click="load">重试</view>
      </view>

      <template v-else>
        <view class="table">
          <view class="tr tr-th">
            <text class="th w-brand">品牌</text>
            <text class="th w-model">型号</text>
            <text class="th w-groups">分组数</text>
            <text class="th w-items">参数项数</text>
            <text class="th w-time">更新时间</text>
            <text class="th w-actions">操作</text>
          </view>
          <view class="tr" v-for="device in list" :key="device.id">
            <view class="td w-brand">
              <view class="brand-cell" v-if="(device.image || device.logo) && !device.imgFail">
                <image class="brand-img" :src="resolveImage(device.image || device.logo)" mode="aspectFit" @error="device.imgFail = true"></image>
              </view>
              <view class="brand-cell" v-else>
                <text class="brand-fallback">📱</text>
              </view>
              <text class="brand-text">{{ device.brand }}</text>
            </view>
            <text class="td w-model">{{ device.model }}</text>
            <text class="td w-groups">{{ device.groupCount }}</text>
            <text class="td w-items">{{ device.itemCount }}</text>
            <text class="td w-time">{{ device.updatedAt }}</text>
            <view class="td w-actions">
              <text class="link" @click="goParams(device)">参数</text>
              <text class="link" @click="openEdit(device)">编辑</text>
              <text class="link link-danger" @click="remove(device)">删除</text>
            </view>
          </view>
          <view class="tr" v-if="!list.length">
            <text class="td">暂无设备，点击右上角「添加设备」</text>
          </view>
        </view>
      </template>
    </view>

    <amodal :show="showForm" :title="form.id ? '编辑设备' : '添加设备'" @confirm="submitForm" @cancel="showForm = false">
      <view class="field">
        <text class="field-label">品牌 *</text>
        <input class="field-input" v-model="form.brand" placeholder="如：小米" placeholder-class="ph" />
      </view>
      <view class="field">
        <text class="field-label">型号 *</text>
        <input class="field-input" v-model="form.model" placeholder="如：15 Ultra" placeholder-class="ph" />
      </view>
    </amodal>
  </view>
</template>

<script>
import { adminGetDevices, adminCreateDevice, adminUpdateDevice, adminDeleteDevice, adminGetBrands, requireLogin } from '@/api/admin'
import { resolveImage } from '@/api'

export default {
  data() {
    return {
      loading: true,
      errorMsg: '',
      list: [],
      showForm: false,
      form: { id: 0, brand: '', model: '' },
    }
  },
  onLoad() {
    if (!requireLogin()) return
    this.load()
  },
  methods: {
    load() {
      this.loading = true
      this.errorMsg = ''
      Promise.all([adminGetDevices(), adminGetBrands()])
        .then(([list, brandImages]) => {
          const logoMap = {}
          ;(brandImages || []).forEach((b) => {
            logoMap[b.name] = b.image || ''
          })
          // 设备未单独上传缩略图时，回退使用品牌 Logo
          this.list = list.map((d) => ({ ...d, logo: logoMap[d.brand] || '' }))
        })
        .catch((err) => {
          this.errorMsg = err.message || '加载失败'
        })
        .finally(() => {
          this.loading = false
        })
    },
    openCreate() {
      this.form = { id: 0, brand: '', model: '' }
      this.showForm = true
    },
    openEdit(device) {
      this.form = { id: device.id, brand: device.brand, model: device.model }
      this.showForm = true
    },
    submitForm() {
      const data = { brand: this.form.brand.trim(), model: this.form.model.trim() }
      if (!data.brand || !data.model) {
        uni.showToast({ title: '品牌和型号必填', icon: 'none' })
        return
      }
      const req = this.form.id ? adminUpdateDevice(this.form.id, data) : adminCreateDevice(data)
      req
        .then(() => {
          this.showForm = false
          uni.showToast({ title: '已保存', icon: 'success' })
          this.load()
        })
        .catch((err) => uni.showToast({ title: err.message || '保存失败', icon: 'none' }))
    },
    remove(device) {
      uni.showModal({
        title: '删除确认',
        content: `确定删除「${device.brand} ${device.model}」吗？其下参数及测试记录将一并删除。`,
        confirmText: '删除',
        cancelText: '取消',
        confirmColor: '#ef4444',
        success: (res) => {
          if (!res.confirm) return
          adminDeleteDevice(device.id)
            .then(() => {
              uni.showToast({ title: '已删除', icon: 'success' })
              this.load()
            })
            .catch((err) => uni.showToast({ title: err.message || '删除失败', icon: 'none' }))
        },
      })
    },
    goParams(device) {
      uni.navigateTo({ url: '/pages/admin/device-edit/device-edit?id=' + device.id })
    },
    resolveImage,
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: transparent;
}
.a-head-left {
  display: flex;
  align-items: center;
}
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;
}
.spinner {
  width: 56rpx;
  height: 56rpx;
  border: 6rpx solid #262b36;
  border-top-color: #5cb3ff;
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.loading-text {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #9aa3b2;
}
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 160rpx 0;
}
.error-text {
  font-size: 28rpx;
  color: #ef4444;
}
.retry-btn {
  margin-top: 32rpx;
  padding: 14rpx 48rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #3d7ef5, #5cb3ff);
  color: #ffffff;
  font-size: 28rpx;
  cursor: pointer;
}
.btn-hover {
  opacity: 0.8;
}
.ph {
  color: #7c8598;
}
.w-brand {
  width: 18%;
}
.brand-cell {
  width: 56rpx;
  height: 56rpx;
  border-radius: 12rpx;
  background-color: rgba(31, 36, 46, 0.65);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  margin-right: 16rpx;
  vertical-align: middle;
}
.brand-img {
  width: 100%;
  height: 100%;
}
.brand-fallback {
  font-size: 28rpx;
}
.brand-text {
  vertical-align: middle;
}
.w-model {
  width: 22%;
}
.w-groups {
  width: 12%;
}
.w-items {
  width: 14%;
}
.w-time {
  flex: 1;
}
.w-actions {
  width: 260rpx;
}
</style>
