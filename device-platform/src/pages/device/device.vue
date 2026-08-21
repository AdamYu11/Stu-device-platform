<template>
  <view class="page">
    <view class="header">
      <view class="status-bar"></view>
      <view class="header-bar">
        <view class="header-brand">
          <view class="brand-mark">
            <view class="brand-mark-core"></view>
          </view>
          <view class="header-titles">
            <text class="header-title">手机参数</text>
            <text class="header-sub">DEVICE PARAMS</text>
          </view>
        </view>
        <view class="refresh-btn" hover-class="refresh-btn-hover" @click="reload">
          <text class="refresh-icon">⟳</text>
          <text class="refresh-text">刷新</text>
        </view>
      </view>
      <view class="header-line"></view>
    </view>

    <view class="body">
      <!-- 品牌列表 -->
      <template v-if="view === 'brands'">
        <view class="loading" v-if="loading">
          <view class="spinner"></view>
          <text class="loading-text">加载中...</text>
        </view>

        <view class="error" v-else-if="errorMsg">
          <text class="error-text">{{ errorMsg }}</text>
          <view class="retry-btn" hover-class="retry-btn-hover" @click="loadList">重试</view>
        </view>

        <template v-else>
          <view class="list-tip">共 {{ brandGroups.length }} 个品牌</view>
          <view class="brand-grid">
            <view
              class="brand-card tech-card"
              v-for="(group, i) in brandGroups"
              :key="group.brand"
              hover-class="brand-card-hover"
              @click="openBrand(group)"
            >
              <text class="brand-index">{{ brandCode(i) }}</text>
              <view class="brand-avatar" v-if="group.logo && !group.imgFail">
                <image class="brand-img" :src="resolveImage(group.logo)" mode="aspectFit" @error="group.imgFail = true"></image>
              </view>
              <view class="brand-avatar" v-else>
                <text class="brand-avatar-icon">📱</text>
              </view>
              <text class="brand-name">{{ group.brand }}</text>
              <view class="brand-sub-row">
                <text class="brand-sub">{{ group.devices.length }} 款机型</text>
                <text class="brand-arrow">›</text>
              </view>
            </view>
          </view>
          <view class="empty" v-if="!brandGroups.length">
            <text class="empty-text">暂无设备参数</text>
          </view>
        </template>
      </template>

      <!-- 品牌下的机型列表 -->
      <template v-else-if="view === 'devices'">
        <view class="list-header">
          <view class="back-btn" hover-class="back-btn-hover" @click="goBackBrands">
            <text class="back-icon">‹</text>
          </view>
          <text class="list-title">{{ currentBrand }}</text>
        </view>

        <view
          class="device-card tech-card"
          v-for="device in brandDevices"
          :key="device.id"
          hover-class="device-card-hover"
          @click="openDevice(device)"
        >
          <view class="device-avatar" v-if="(device.image || device.logo) && !device.imgFail">
            <image class="device-img" :src="resolveImage(device.image || device.logo)" mode="aspectFit" @error="device.imgFail = true"></image>
          </view>
          <view class="device-avatar" v-else>
            <text class="device-avatar-icon">📱</text>
          </view>
          <view class="device-info">
            <text class="device-name">{{ device.brand }} {{ device.model }}</text>
            <text class="device-sub">{{ device.groupCount }} 组参数 · {{ device.itemCount }} 项</text>
          </view>
          <view class="device-go">
            <text class="card-arrow">›</text>
          </view>
        </view>
      </template>

      <!-- 设备参数详情 -->
      <template v-else-if="view === 'detail'">
        <view class="list-header">
          <view class="back-btn" hover-class="back-btn-hover" @click="goBackDevices">
            <text class="back-icon">‹</text>
          </view>
          <text class="list-title">{{ device ? device.brand + ' ' + device.model : '参数详情' }}</text>
        </view>

        <view class="loading" v-if="loading">
          <view class="spinner"></view>
          <text class="loading-text">加载中...</text>
        </view>

        <view class="error" v-else-if="errorMsg">
          <text class="error-text">{{ errorMsg }}</text>
          <view class="retry-btn" hover-class="retry-btn-hover" @click="reload">重试</view>
        </view>

        <template v-else-if="device">
          <view class="hero-card">
            <view class="scanline"></view>
            <view class="hero-avatar" v-if="(device.image || device.logo) && !device.imgFail">
              <image class="hero-img" :src="resolveImage(device.image || device.logo)" mode="aspectFit" @error="device.imgFail = true"></image>
            </view>
            <view class="hero-avatar" v-else>
              <text class="hero-avatar-icon">📱</text>
            </view>
            <view class="hero-info">
              <view class="hero-brand-row">
                <text class="hero-brand">{{ device.brand }}</text>
                <view class="hero-online">
                  <view class="tech-dot"></view>
                  <text class="hero-online-text">DATABASE ONLINE</text>
                </view>
              </view>
              <text class="hero-name">{{ device.model }}</text>
              <view class="hero-meta">
                <text class="hero-meta-text"><text class="hero-meta-num tech-value">{{ device.groups.length }}</text> 组参数 · <text class="hero-meta-num tech-value">{{ totalItems }}</text> 项</text>
                <text class="hero-time" v-if="device.updatedAt">更新于 {{ device.updatedAt }}</text>
              </view>
            </view>
          </view>

          <!-- 参数分组切换 -->
          <scroll-view class="group-tabs" scroll-x :show-scrollbar="false">
            <view class="group-tabs-inner">
              <view class="group-tab" :class="{ 'group-tab-active': activeGroup === 'all' }" @click="activeGroup = 'all'">
                <text class="group-tab-text">全部</text>
              </view>
              <view
                class="group-tab"
                v-for="(group, gi) in device.groups"
                :key="group.id !== undefined ? group.id : group.title"
                :class="{ 'group-tab-active': activeGroup === gi }"
                @click="activeGroup = gi"
              >
                <text class="group-tab-text">{{ group.title }}</text>
              </view>
            </view>
          </scroll-view>

          <!-- 参数表：规格表样式 -->
          <view class="spec-card tech-card" v-for="group in displayGroups" :key="group.id !== undefined ? group.id : group.title">
            <view class="spec-head">
              <view class="group-dot"></view>
              <text class="spec-title">{{ group.title }}</text>
              <text class="spec-count">{{ group.items.length }} 项</text>
            </view>
            <view class="spec-row" v-for="item in group.items" :key="item.id !== undefined ? item.id : item.label">
              <text class="spec-label">{{ item.label }}</text>
              <text class="spec-value tech-value">{{ item.value }}</text>
            </view>
          </view>

          <view class="list-end">— 参数由后端数据库提供 —</view>
        </template>
      </template>
    </view>

    <tabbar current="pages/device/device"></tabbar>
  </view>
</template>

<script>
import { getDeviceList, getDeviceInfo, getBrands, resolveImage } from '@/api'

export default {
  data() {
    return {
      view: 'brands',
      loading: true,
      errorMsg: '',
      list: [],
      brandImages: {},
      currentBrand: '',
      device: null,
      deviceId: '',
      activeGroup: 'all',
    }
  },
  computed: {
    brandGroups() {
      const map = {}
      this.list.forEach((d) => {
        if (!map[d.brand]) map[d.brand] = { brand: d.brand, devices: [] }
        map[d.brand].devices.push(d)
      })
      return Object.keys(map).map((k) => ({
        brand: k,
        devices: map[k].devices,
        logo: this.brandImages[k] || '',
      }))
    },
    brandDevices() {
      const group = this.brandGroups.find((g) => g.brand === this.currentBrand)
      if (!group) return []
      // 设备未单独上传缩略图时，回退使用品牌 Logo
      return group.devices.map((d) => ({ ...d, logo: this.brandImages[d.brand] || '' }))
    },
    displayGroups() {
      if (!this.device || !this.device.groups) return []
      if (this.activeGroup === 'all') return this.device.groups
      const group = this.device.groups[this.activeGroup]
      return group ? [group] : []
    },
    totalItems() {
      if (!this.device || !this.device.groups) return 0
      return this.device.groups.reduce((sum, g) => sum + (g.items ? g.items.length : 0), 0)
    },
  },
  onLoad() {
    this.loadList()
  },
  onPullDownRefresh() {
    this.reload(() => uni.stopPullDownRefresh())
  },
  methods: {
    loadList() {
      this.loading = true
      this.errorMsg = ''
      Promise.all([getDeviceList(), getBrands()])
        .then(([list, brands]) => {
          this.list = list
          const map = {}
          ;(brands || []).forEach((b) => {
            map[b.name] = b.image || ''
          })
          this.brandImages = map
        })
        .catch((err) => {
          this.errorMsg = err.message || '加载失败'
        })
        .finally(() => {
          this.loading = false
        })
    },
    openBrand(group) {
      this.currentBrand = group.brand
      this.view = 'devices'
    },
    goBackBrands() {
      this.view = 'brands'
    },
    openDevice(device) {
      this.view = 'detail'
      this.deviceId = device.id
      this.activeGroup = 'all'
      this.device = null
      this.loading = true
      this.errorMsg = ''
      getDeviceInfo(device.id)
        .then((data) => {
          // 设备未单独上传缩略图时，回退使用品牌 Logo
          data.logo = this.brandImages[this.currentBrand] || ''
          this.device = data
        })
        .catch((err) => {
          this.errorMsg = err.message || '加载失败'
        })
        .finally(() => {
          this.loading = false
        })
    },
    goBackDevices() {
      this.device = null
      this.view = 'devices'
    },
    reload(done) {
      if (this.view === 'brands') {
        this.loadList()
      } else if (this.view === 'devices') {
        this.loadList()
      } else if (this.deviceId) {
        this.openDevice({ id: this.deviceId })
      }
      if (typeof done === 'function') done()
    },
    brandCode(i) {
      return ('0' + (i + 1)).slice(-2)
    },
    resolveImage,
  },
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: transparent;
  box-sizing: border-box;
}

/* ---------- 头部 ---------- */
.header {
  position: sticky;
  top: 0;
  z-index: 100;
  background-color: rgba(10, 14, 22, 0.82);
  border-bottom: 1px solid var(--line);
}
.header-line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1rpx;
  height: 1rpx;
  background: linear-gradient(90deg, transparent, rgba(77, 166, 255, 0.4), transparent);
  pointer-events: none;
}
.status-bar {
  height: var(--status-bar-height);
}
/* #ifdef H5 */
.status-bar {
  height: env(safe-area-inset-top);
}
/* #endif */
.header-bar {
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24rpx;
}
.header-brand {
  display: flex;
  align-items: center;
}
.brand-mark {
  width: 56rpx;
  height: 56rpx;
  border-radius: 14rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 18rpx;
  background: linear-gradient(135deg, rgba(77, 166, 255, 0.2), rgba(53, 201, 238, 0.06));
  border: 1px solid rgba(77, 166, 255, 0.38);
  box-shadow: 0 0 14px rgba(77, 166, 255, 0.18);
}
.brand-mark-core {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background-color: var(--accent-cyan);
  box-shadow: 0 0 10px rgba(53, 201, 238, 0.9);
}
.header-titles {
  display: flex;
  flex-direction: column;
}
.header-title {
  font-size: 36rpx;
  font-weight: 600;
  color: var(--text-1);
  line-height: 1.15;
}
.header-sub {
  font-size: 18rpx;
  letter-spacing: 3rpx;
  color: var(--text-3);
  margin-top: 2rpx;
}
.refresh-btn {
  display: flex;
  align-items: center;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background-color: rgba(18, 26, 42, 0.7);
  border: 1px solid rgba(77, 166, 255, 0.28);
}
.refresh-btn-hover {
  opacity: 0.7;
}
.refresh-icon {
  font-size: 28rpx;
  color: var(--accent);
  margin-right: 8rpx;
}
.refresh-text {
  font-size: 26rpx;
  color: var(--text-2);
}

.body {
  padding: 24rpx 24rpx 200rpx;
}

/* ---------- 加载 / 错误 ---------- */
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx 0;
}
.spinner {
  width: 56rpx;
  height: 56rpx;
  border: 6rpx solid rgba(122, 162, 220, 0.14);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.9s linear infinite;
  box-shadow: 0 0 18px rgba(77, 166, 255, 0.18);
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
.loading-text {
  margin-top: 24rpx;
  font-size: 26rpx;
  color: var(--text-2);
}
.error {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 200rpx 0;
}
.error-text {
  font-size: 28rpx;
  color: #f48a8a;
}
.retry-btn {
  margin-top: 32rpx;
  padding: 14rpx 48rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #2f7bff, #35c9ee);
  color: #ffffff;
  font-size: 28rpx;
  box-shadow: 0 0 20px rgba(53, 150, 255, 0.3);
}
.retry-btn-hover {
  opacity: 0.8;
}

.list-tip {
  display: flex;
  align-items: center;
  font-size: 24rpx;
  color: var(--text-2);
  letter-spacing: 2rpx;
  margin-bottom: 20rpx;
}
.list-tip::before {
  content: '';
  width: 8rpx;
  height: 8rpx;
  border-radius: 2rpx;
  background-color: var(--accent);
  box-shadow: 0 0 8px rgba(77, 166, 255, 0.8);
  margin-right: 12rpx;
}

/* ---------- 品牌卡片 ---------- */
.brand-grid {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
}
.brand-card {
  width: 48%;
  box-sizing: border-box;
  padding: 28rpx 16rpx 24rpx;
  margin-bottom: 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  min-height: 300rpx;
}
.brand-card-hover {
  opacity: 0.92;
}
.brand-index {
  position: absolute;
  top: 16rpx;
  left: 20rpx;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace;
  font-size: 20rpx;
  color: var(--text-3);
  letter-spacing: 1rpx;
}
.brand-avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 28rpx;
  background: linear-gradient(160deg, rgba(30, 42, 64, 0.7), rgba(15, 22, 36, 0.8));
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  margin-bottom: 18rpx;
}
.brand-avatar-icon {
  font-size: 72rpx;
}
.brand-img {
  width: 100%;
  height: 100%;
}
.brand-name {
  font-size: 28rpx;
  font-weight: 700;
  color: var(--text-1);
  text-align: center;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  word-break: break-all;
  line-height: 1.3;
  max-width: 100%;
}
.brand-sub-row {
  display: flex;
  align-items: center;
  margin-top: 8rpx;
}
.brand-sub {
  font-size: 22rpx;
  color: var(--text-2);
  margin-right: 6rpx;
  text-align: center;
}
.brand-arrow {
  font-size: 30rpx;
  color: var(--accent);
  line-height: 1;
  margin-top: -2rpx;
}

/* ---------- 机型卡片 ---------- */
.device-card {
  display: flex;
  align-items: center;
  padding: 28rpx;
  margin-bottom: 20rpx;
}
.device-card-hover {
  opacity: 0.92;
}
.device-avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 28rpx;
  background: linear-gradient(160deg, rgba(30, 42, 64, 0.7), rgba(15, 22, 36, 0.8));
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 28rpx;
  flex-shrink: 0;
  overflow: hidden;
}
.device-img {
  width: 100%;
  height: 100%;
}
.device-avatar-icon {
  font-size: 80rpx;
}
.device-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.device-name {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-1);
  word-break: break-all;
}
.device-sub {
  font-size: 24rpx;
  color: var(--text-2);
  margin-top: 10rpx;
}
.device-go {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  border: 1px solid rgba(77, 166, 255, 0.3);
  background-color: rgba(77, 166, 255, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-left: 16rpx;
}
.card-arrow {
  font-size: 32rpx;
  color: var(--accent);
  line-height: 1;
  margin-top: -2rpx;
}

/* ---------- 返回头 ---------- */
.list-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
}
.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgba(18, 26, 42, 0.7);
  border: 1px solid rgba(77, 166, 255, 0.28);
  margin-right: 16rpx;
}
.back-btn-hover {
  opacity: 0.7;
}
.back-icon {
  font-size: 44rpx;
  color: var(--text-1);
  line-height: 1;
  margin-top: -6rpx;
}
.list-title {
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-1);
  flex: 1;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

/* ---------- 详情 hero ---------- */
.hero-card {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, rgba(45, 120, 255, 0.2), rgba(13, 19, 32, 0.72));
  border: 1px solid rgba(77, 166, 255, 0.26);
  border-radius: 20rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 0 30px rgba(45, 120, 255, 0.08);
}
.hero-avatar {
  width: 160rpx;
  height: 160rpx;
  border-radius: 28rpx;
  background-color: rgba(15, 22, 36, 0.7);
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 28rpx;
  flex-shrink: 0;
  overflow: hidden;
}
.hero-img {
  width: 100%;
  height: 100%;
}
.hero-avatar-icon {
  font-size: 72rpx;
}
.hero-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  flex: 1;
}
.hero-brand-row {
  display: flex;
  align-items: center;
}
.hero-brand {
  font-size: 24rpx;
  color: var(--text-2);
}
.hero-online {
  display: flex;
  align-items: center;
  margin-left: 16rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background-color: rgba(62, 207, 158, 0.07);
  border: 1px solid rgba(62, 207, 158, 0.22);
}
.hero-online-text {
  font-size: 16rpx;
  color: #8fd8bd;
  letter-spacing: 2rpx;
  margin-left: 8rpx;
}
.hero-name {
  font-size: 38rpx;
  font-weight: 700;
  color: var(--text-1);
  margin: 8rpx 0 0;
}
.hero-meta {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  margin-top: 8rpx;
}
.hero-meta-text {
  font-size: 22rpx;
  color: var(--text-3);
}
.hero-meta-num {
  color: var(--accent);
}
.hero-time {
  font-size: 22rpx;
  color: var(--text-3);
  margin-left: 16rpx;
}

/* ---------- 参数组切换 ---------- */
.group-tabs {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 20rpx;
}
.group-tabs-inner {
  display: inline-flex;
  padding: 2rpx;
}
.group-tab {
  display: inline-flex;
  align-items: center;
  padding: 12rpx 30rpx;
  margin-right: 16rpx;
  border-radius: 999rpx;
  background-color: rgba(18, 26, 42, 0.7);
  border: 1px solid var(--line);
  flex-shrink: 0;
}
.group-tab-active {
  background: linear-gradient(135deg, rgba(77, 166, 255, 0.24), rgba(53, 201, 238, 0.12));
  border-color: rgba(77, 166, 255, 0.55);
  box-shadow: 0 0 14px rgba(77, 166, 255, 0.18);
}
.group-tab-text {
  font-size: 24rpx;
  color: var(--text-2);
  letter-spacing: 1rpx;
}
.group-tab-active .group-tab-text {
  color: var(--accent);
}

/* ---------- 参数表（规格表样式） ---------- */
.spec-card {
  margin-bottom: 24rpx;
  overflow: hidden;
}
.spec-head {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  border-bottom: 1px solid var(--line);
  background: linear-gradient(90deg, rgba(77, 166, 255, 0.1), rgba(18, 26, 42, 0.4));
}
.spec-title {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-1);
}
.spec-count {
  font-size: 20rpx;
  color: var(--text-3);
  margin-left: auto;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace;
}
.group-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4da6ff, #35c9ee);
  box-shadow: 0 0 8px rgba(77, 166, 255, 0.6);
  margin-right: 12rpx;
  flex-shrink: 0;
}
.spec-row {
  display: flex;
  align-items: flex-start;
  padding: 20rpx 24rpx;
  border-bottom: 1px solid rgba(122, 162, 220, 0.07);
}
.spec-row:last-child {
  border-bottom: none;
}
/* 斑马纹 */
.spec-row:nth-child(even) {
  background-color: rgba(122, 162, 220, 0.03);
}
.spec-label {
  width: 220rpx;
  flex-shrink: 0;
  font-size: 26rpx;
  color: var(--text-2);
  padding-right: 24rpx;
  box-sizing: border-box;
  line-height: 1.5;
}
.spec-value {
  flex: 1;
  font-size: 28rpx;
  color: var(--text-1);
  text-align: right;
  word-break: break-all;
  line-height: 1.5;
}

.empty {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}
.empty-text {
  font-size: 26rpx;
  color: var(--text-3);
}
.list-end {
  text-align: center;
  font-size: 22rpx;
  color: var(--text-3);
  padding: 24rpx 0;
}

/* #ifdef H5 */
/* 桌面端布局 */
@media (min-width: 768px) {
  .page {
    padding-top: 64px;
  }
  .header {
    position: static;
    background-color: transparent;
    border-bottom: none;
  }
  .header-line {
    display: none;
  }
  .header-bar {
    max-width: 1200px;
    margin: 0 auto;
    padding: 32px 24px 0;
  }
  .header-title {
    font-size: 30px;
  }
  .header-sub {
    font-size: 11px;
  }
  .body {
    max-width: 1200px;
    margin: 0 auto;
    padding-bottom: 60rpx;
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    align-items: start;
  }
  .list-tip,
  .loading,
  .error,
  .empty,
  .list-header,
  .hero-card,
  .group-tabs,
  .list-end,
  .brand-grid {
    grid-column: 1 / -1;
  }
  .brand-grid {
    display: grid;
    grid-template-columns: repeat(5, 1fr);
    gap: 20px;
  }
  .brand-card {
    width: auto;
    min-height: 0;
    margin-bottom: 0;
  }
  .device-card {
    margin-bottom: 0;
  }
  .spec-card {
    margin-bottom: 0;
  }
}
/* #endif */
</style>
