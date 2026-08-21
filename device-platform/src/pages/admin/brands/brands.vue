<template>
  <view class="page">
    <view class="a-header">
      <view class="a-head-left">
        <text class="a-title">品牌 Logo 管理</text>
        <admin-nav current="brands"></admin-nav>
      </view>
      <view class="a-actions">
        <view class="a-btn a-btn-ghost" hover-class="btn-hover" @click="load">刷新</view>
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
        <view class="tip">品牌自动汇总自手机参数管理；上传的 Logo 展示在前台品牌列表</view>
        <view class="brand-grid">
          <view class="brand-card" v-for="brand in brands" :key="brand.name">
            <view class="brand-preview" v-if="brand.image && !brand.imgFail" @click="upload(brand)">
              <image class="brand-img" :src="resolveImage(brand.image)" mode="aspectFit" @error="brand.imgFail = true"></image>
            </view>
            <view class="brand-preview brand-preview-empty" v-else @click="upload(brand)">
              <text class="brand-fallback">＋</text>
              <text class="brand-fallback-tip">上传</text>
            </view>
            <text class="brand-name">{{ brand.name }}</text>
            <text class="brand-count">{{ brand.count }} 款机型</text>
            <view class="brand-actions">
              <text class="act-link" @click="upload(brand)">{{ brand.image ? '更换' : '上传' }}</text>
              <text class="act-link act-danger" v-if="brand.image" @click="removeImage(brand)">移除</text>
            </view>
          </view>
          <view class="empty" v-if="!brands.length">
            <text class="empty-text">暂无品牌，请先在手机参数管理中添加设备</text>
          </view>
        </view>
      </template>
    </view>
  </view>
</template>

<script>
import { adminGetDevices, adminGetBrands, adminSaveBrandImage, adminUploadImage, requireLogin } from '@/api/admin'
import { resolveImage } from '@/api'

export default {
  data() {
    return {
      loading: true,
      errorMsg: '',
      brands: [],
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
        .then(([devices, brandImages]) => {
          const map = {}
          ;(brandImages || []).forEach((b) => {
            map[b.name] = b.image || ''
          })
          const counts = {}
          devices.forEach((d) => {
            counts[d.brand] = (counts[d.brand] || 0) + 1
            if (!(d.brand in map) && map[d.brand] === undefined) map[d.brand] = ''
          })
          const names = Object.keys(counts).sort()
          this.brands = names.map((n) => ({ name: n, count: counts[n], image: map[n] || '', imgFail: false }))
        })
        .catch((err) => {
          this.errorMsg = err.message || '加载失败'
        })
        .finally(() => {
          this.loading = false
        })
    },
    upload(brand) {
      uni.chooseImage({
        count: 1,
        success: (res) => {
          const filePath = res.tempFilePaths[0]
          uni.showLoading({ title: '上传中...' })
          adminUploadImage(filePath)
            .then((url) => adminSaveBrandImage(brand.name, url))
            .then(() => {
              uni.showToast({ title: '已上传', icon: 'success' })
              this.load()
            })
            .catch((err) => uni.showToast({ title: err.message || '上传失败', icon: 'none' }))
            .finally(() => uni.hideLoading())
        },
      })
    },
    removeImage(brand) {
      uni.showModal({
        title: '移除 Logo',
        content: `确定移除「${brand.name}」的品牌 Logo 吗？`,
        confirmText: '移除',
        cancelText: '取消',
        confirmColor: '#ef4444',
        success: (res) => {
          if (!res.confirm) return
          adminSaveBrandImage(brand.name, '')
            .then(() => {
              uni.showToast({ title: '已移除', icon: 'success' })
              this.load()
            })
            .catch((err) => uni.showToast({ title: err.message || '操作失败', icon: 'none' }))
        },
      })
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
.a-btn-ghost {
  background-color: rgba(31, 36, 46, 0.65);
  border: 1px solid rgba(92, 179, 255, 0.2);
  color: #c3c9d6;
  margin-right: 20rpx;
}
.btn-hover {
  opacity: 0.8;
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
.tip {
  font-size: 24rpx;
  color: #9aa3b2;
  margin-bottom: 28rpx;
}

.brand-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220rpx, 1fr));
  gap: 24rpx;
}
.brand-card {
  background-color: rgba(24, 27, 34, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20rpx;
  padding: 28rpx 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.brand-preview {
  width: 150rpx;
  height: 150rpx;
  border-radius: 20rpx;
  background-color: rgba(15, 17, 21, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  cursor: pointer;
  transition: border-color 0.2s ease;
}
.brand-preview:hover {
  border-color: #5cb3ff;
}
.brand-preview-empty {
  flex-direction: column;
  border-style: dashed;
}
.brand-img {
  width: 100%;
  height: 100%;
}
.brand-fallback {
  font-size: 48rpx;
  color: #7c8598;
  line-height: 1;
}
.brand-fallback-tip {
  font-size: 22rpx;
  color: #7c8598;
  margin-top: 8rpx;
}
.brand-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #e6e8ee;
  margin-top: 20rpx;
  max-width: 100%;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.brand-count {
  font-size: 22rpx;
  color: #7c8598;
  margin-top: 8rpx;
}
.brand-actions {
  display: flex;
  margin-top: 18rpx;
}
.act-link {
  font-size: 24rpx;
  color: #5cb3ff;
  cursor: pointer;
  padding: 4rpx 20rpx;
}
.act-link:hover {
  text-decoration: underline;
}
.act-danger {
  color: #ef4444;
  border-left: 1px solid #2c3342;
}

.empty {
  grid-column: 1 / -1;
  text-align: center;
  padding: 100rpx 0;
}
.empty-text {
  font-size: 26rpx;
  color: #7c8598;
}
</style>
