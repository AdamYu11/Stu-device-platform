<template>
  <view class="page">
    <view class="header">
      <view class="status-bar"></view>
      <view class="header-bar">
        <view class="back-btn" hover-class="back-btn-hover" @click="goBack">
          <text class="back-icon">‹</text>
        </view>
        <text class="header-title">{{ project ? project.name : '项目详情' }}</text>
        <view class="header-placeholder"></view>
      </view>
      <view class="header-line"></view>
    </view>

    <view class="body">
      <view class="loading" v-if="loading">
        <view class="spinner"></view>
        <text class="loading-text">加载中...</text>
      </view>

      <view class="error" v-else-if="errorMsg">
        <text class="error-text">{{ errorMsg }}</text>
        <view class="retry-btn" hover-class="retry-btn-hover" @click="loadData">重试</view>
      </view>

      <template v-else-if="project">
        <view class="hero-card">
          <view class="scanline"></view>
          <view class="hero-top">
            <text class="hero-code">PROJECT</text>
            <view class="hero-online">
              <view class="tech-dot"></view>
              <text class="hero-online-text">DATABASE ONLINE</text>
            </view>
          </view>
          <text class="hero-name">{{ project.name }}</text>
          <text class="hero-remark" v-if="project.remark">{{ project.remark }}</text>
          <text class="hero-time">录入于 {{ project.createdAt }} · {{ project.records.length }} 款机型</text>
        </view>

        <view class="record-card tech-card" v-for="record in project.records" :key="record.id">
          <!-- 机型头部 -->
          <view class="record-head" v-if="record.device">
            <view class="record-thumb" v-if="(record.device.image || record.device.logo) && !record.device.imgFail">
              <image class="record-img" :src="resolveImage(record.device.image || record.device.logo)" mode="aspectFit" @error="record.device.imgFail = true"></image>
            </view>
            <view class="record-thumb" v-else>
              <text class="record-thumb-icon">📱</text>
            </view>
            <view class="record-head-main">
              <text class="record-device">{{ record.device.brand }} {{ record.device.model }}</text>
              <text class="record-time" v-if="record.device.updatedAt">参数更新于 {{ record.device.updatedAt }}</text>
            </view>
          </view>

          <!-- 测试结果（重点内容，优先展示） -->
          <view class="sub-section">
            <view class="sub-title">
              <view class="sub-dot result-dot"></view>
              <text class="sub-text">测试结果</text>
              <text class="tech-tag sub-count">{{ record.params.length }} 项</text>
            </view>
            <view class="params-card">
              <view class="info-row" v-for="param in record.params" :key="param.id !== undefined ? param.id : param.label">
                <text class="info-label">{{ param.label }}</text>
                <text class="info-value tech-value">{{ param.value }}</text>
              </view>
              <view class="params-empty" v-if="!record.params.length">暂无测试结果</view>
            </view>
          </view>

          <!-- 手机参数：次要内容，默认折叠，点击分组展开 -->
          <view class="sub-section" v-if="record.device && record.device.groups">
            <view class="sub-title">
              <view class="sub-dot"></view>
              <text class="sub-text">手机参数</text>
              <text class="sub-hint">点击展开</text>
            </view>
            <view
              class="param-group"
              v-for="(group, gi) in record.device.groups"
              :key="group.id !== undefined ? group.id : group.title"
            >
              <view
                class="param-group-head"
                hover-class="param-group-head-hover"
                @click="toggleGroup(record, gi)"
              >
                <view class="param-group-dot" :class="{ 'param-group-dot-open': isGroupExpanded(record, gi) }"></view>
                <text class="param-group-title">{{ group.title }}</text>
                <text class="param-group-count">{{ group.items.length }} 项</text>
                <text class="param-group-arrow" :class="{ 'param-group-arrow-open': isGroupExpanded(record, gi) }">›</text>
              </view>
              <view class="param-group-body" v-if="isGroupExpanded(record, gi)">
                <view class="info-row" v-for="item in group.items" :key="item.id !== undefined ? item.id : item.label">
                  <text class="info-label">{{ item.label }}</text>
                  <text class="info-value tech-value">{{ item.value }}</text>
                </view>
              </view>
            </view>
          </view>
        </view>

        <view class="empty" v-if="!project.records.length">
          <text class="empty-text">该项目暂无机型测试数据</text>
        </view>

        <view class="list-end">— 测试数据由后端数据库提供 —</view>
      </template>
    </view>
  </view>
</template>

<script>
import { getProjectDetail, getBrands, resolveImage } from '@/api'

export default {
  data() {
    return {
      id: '',
      loading: true,
      errorMsg: '',
      project: null,
      expandedGroups: {},
    }
  },
  onLoad(options) {
    this.id = options.id || ''
    this.loadData()
  },
  methods: {
    loadData() {
      this.loading = true
      this.errorMsg = ''
      Promise.all([getProjectDetail(this.id), getBrands()])
        .then(([data, brands]) => {
          // 设备未单独上传缩略图时，回退使用品牌 Logo
          const logoMap = {}
          ;(brands || []).forEach((b) => {
            logoMap[b.name] = b.image || ''
          })
          ;(data.records || []).forEach((r) => {
            if (r.device) r.device.logo = logoMap[r.device.brand] || ''
          })
          this.project = data
        })
        .catch((err) => {
          this.errorMsg = err.message || '加载失败'
        })
        .finally(() => {
          this.loading = false
        })
    },
    resolveImage,
    isGroupExpanded(record, gi) {
      return !!this.expandedGroups[record.id + '-' + gi]
    },
    toggleGroup(record, gi) {
      const key = record.id + '-' + gi
      this.expandedGroups[key] = !this.expandedGroups[key]
    },
    goBack() {
      const pages = getCurrentPages()
      if (pages.length > 1) {
        uni.navigateBack()
      } else {
        uni.reLaunch({ url: '/pages/index/index' })
      }
    },
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
.back-btn {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgba(18, 26, 42, 0.7);
  border: 1px solid rgba(77, 166, 255, 0.28);
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
.header-title {
  font-size: 34rpx;
  font-weight: 600;
  color: var(--text-1);
  max-width: 480rpx;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}
.header-placeholder {
  width: 64rpx;
  height: 64rpx;
}

.body {
  padding: 24rpx 24rpx 60rpx;
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

/* ---------- 项目 hero ---------- */
.hero-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, rgba(45, 120, 255, 0.2), rgba(13, 19, 32, 0.72));
  border: 1px solid rgba(77, 166, 255, 0.26);
  border-radius: 20rpx;
  padding: 32rpx 32rpx 36rpx;
  margin-bottom: 24rpx;
  display: flex;
  flex-direction: column;
  box-shadow: 0 0 30px rgba(45, 120, 255, 0.08);
}
.hero-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}
.hero-code {
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace;
  font-size: 20rpx;
  color: var(--accent);
  letter-spacing: 3rpx;
}
.hero-online {
  display: flex;
  align-items: center;
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
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text-1);
}
.hero-remark {
  font-size: 26rpx;
  color: var(--text-2);
  margin-top: 12rpx;
  line-height: 1.5;
}
.hero-time {
  font-size: 22rpx;
  color: var(--text-3);
  margin-top: 12rpx;
}

/* ---------- 机型记录卡片 ---------- */
.record-card {
  padding: 24rpx 28rpx 8rpx;
  margin-bottom: 24rpx;
}
.record-head {
  display: flex;
  align-items: center;
  padding-bottom: 16rpx;
  border-bottom: 1px solid var(--line);
  margin-bottom: 8rpx;
}
.record-thumb {
  width: 160rpx;
  height: 160rpx;
  border-radius: 28rpx;
  background: linear-gradient(160deg, rgba(30, 42, 64, 0.7), rgba(15, 22, 36, 0.8));
  border: 1px solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;
  overflow: hidden;
}
.record-img {
  width: 100%;
  height: 100%;
}
.record-thumb-icon {
  font-size: 80rpx;
}
.record-head-main {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.record-device {
  font-size: 32rpx;
  font-weight: 700;
  color: var(--text-1);
}
.record-time {
  font-size: 20rpx;
  color: var(--text-3);
  margin-top: 6rpx;
}

/* ---------- 分区 ---------- */
.sub-section {
  margin-bottom: 16rpx;
}
.sub-title {
  display: flex;
  align-items: center;
  padding: 12rpx 0 10rpx;
}
.sub-dot {
  width: 10rpx;
  height: 10rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #4da6ff, #35c9ee);
  box-shadow: 0 0 6px rgba(77, 166, 255, 0.7);
  margin-right: 10rpx;
}
.result-dot {
  background: linear-gradient(135deg, #3ecf9e, #35c9ee);
  box-shadow: 0 0 6px rgba(62, 207, 158, 0.7);
}
.sub-text {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-1);
}
.sub-count {
  margin-left: auto;
}
.sub-hint {
  font-size: 20rpx;
  color: var(--text-3);
  margin-left: auto;
  letter-spacing: 1rpx;
}

/* ---------- 参数组 / 参数卡 ---------- */
.param-group {
  background: linear-gradient(160deg, rgba(24, 34, 52, 0.55), rgba(15, 22, 36, 0.6));
  border: 1px solid rgba(77, 166, 255, 0.16);
  border-radius: 16rpx;
  padding: 0 24rpx;
  margin-bottom: 16rpx;
  overflow: hidden;
}
.param-group-head {
  display: flex;
  align-items: center;
  padding: 22rpx 0;
}
.param-group-head-hover {
  opacity: 0.75;
}
.param-group-dot {
  width: 8rpx;
  height: 8rpx;
  border-radius: 50%;
  background-color: rgba(77, 166, 255, 0.45);
  margin-right: 12rpx;
  flex-shrink: 0;
  transition: background-color 0.2s ease, box-shadow 0.2s ease;
}
.param-group-dot-open {
  background-color: var(--accent);
  box-shadow: 0 0 6px rgba(77, 166, 255, 0.8);
}
.param-group-title {
  font-size: 26rpx;
  font-weight: 600;
  color: var(--text-1);
  flex: 1;
  min-width: 0;
}
.param-group-count {
  font-size: 20rpx;
  color: var(--text-3);
  margin-right: 10rpx;
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace;
}
.param-group-arrow {
  font-size: 30rpx;
  color: var(--text-2);
  line-height: 1;
  margin-top: -2rpx;
  transition: transform 0.2s ease, color 0.2s ease;
}
.param-group-arrow-open {
  transform: rotate(90deg);
  color: var(--accent);
}
.param-group-body {
  border-top: 1px solid rgba(122, 162, 220, 0.1);
}

.params-card {
  background: linear-gradient(160deg, rgba(24, 34, 52, 0.55), rgba(15, 22, 36, 0.6));
  border: 1px solid rgba(77, 166, 255, 0.16);
  border-radius: 16rpx;
  padding: 4rpx 24rpx;
}
.info-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1px solid rgba(122, 162, 220, 0.07);
}
.info-row:last-child {
  border-bottom: none;
}
.info-label {
  font-size: 26rpx;
  color: var(--text-2);
  margin-right: 24rpx;
  flex-shrink: 0;
}
.info-value {
  font-size: 28rpx;
  font-weight: 600;
  color: var(--text-1);
  text-align: right;
  word-break: break-all;
}
.params-empty {
  padding: 28rpx 0;
  font-size: 26rpx;
  color: var(--text-3);
  text-align: center;
}

.empty {
  display: flex;
  justify-content: center;
  padding: 80rpx 0;
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
    padding: 24px 24px 0;
  }
  .header-title {
    font-size: 22px;
    max-width: 700px;
  }
  .body {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    align-items: start;
  }
  .hero-card,
  .loading,
  .error,
  .empty,
  .list-end {
    grid-column: 1 / -1;
  }
  .record-card {
    margin-bottom: 0;
  }
}
@media (min-width: 1100px) {
  .body {
    grid-template-columns: repeat(3, 1fr);
  }
}
/* #endif */
</style>
