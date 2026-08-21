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
            <text class="header-title">测试数据</text>
            <text class="header-sub">TEST PROJECTS</text>
          </view>
        </view>
        <view class="refresh-btn" hover-class="refresh-btn-hover" @click="loadData">
          <text class="refresh-icon">⟳</text>
          <text class="refresh-text">刷新</text>
        </view>
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

      <template v-else>
        <view class="list-tip">共 {{ list.length }} 个测试项目</view>

        <view
          class="project-card tech-card"
          v-for="(project, i) in list"
          :key="project.id"
          hover-class="project-card-hover"
          @click="goDetail(project)"
        >
          <view class="card-head">
            <text class="project-name">{{ project.name }}</text>
            <view class="param-count">{{ project.recordCount }} 款机型</view>
          </view>
          <text class="project-remark" v-if="project.remark">{{ project.remark }}</text>
          <view class="card-foot">
            <text class="project-time">
              <text class="card-code">PRJ-{{ cardCode(i) }}</text> · 录入于 {{ project.createdAt }}
            </text>
            <view class="card-go">
              <text class="card-go-text">查看详情</text>
              <text class="card-arrow">›</text>
            </view>
          </view>
        </view>

        <view class="empty" v-if="!list.length">
          <text class="empty-text">暂无测试项目</text>
        </view>

        <view class="list-end" v-if="list.length">— 已加载全部数据 —</view>
      </template>
    </view>

    <tabbar current="pages/index/index"></tabbar>
  </view>
</template>

<script>
import { getProjectList } from '@/api'

export default {
  data() {
    return {
      loading: true,
      errorMsg: '',
      list: [],
    }
  },
  onLoad() {
    this.loadData()
  },
  onPullDownRefresh() {
    this.loadData(() => uni.stopPullDownRefresh())
  },
  methods: {
    loadData(done) {
      this.loading = true
      this.errorMsg = ''
      getProjectList()
        .then((list) => {
          this.list = list
        })
        .catch((err) => {
          this.errorMsg = err.message || '加载失败'
        })
        .finally(() => {
          this.loading = false
          if (typeof done === 'function') done()
        })
    },
    goDetail(project) {
      uni.navigateTo({ url: '/pages/detail/detail?id=' + project.id })
    },
    cardCode(i) {
      return ('0' + (i + 1)).slice(-2)
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

/* ---------- 列表 ---------- */
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

.project-card {
  padding: 36rpx 32rpx;
  margin-bottom: 24rpx;
}
.project-card-hover {
  opacity: 0.92;
}
.card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.project-name {
  font-size: 36rpx;
  font-weight: 700;
  color: var(--text-1);
  flex: 1;
  margin-right: 16rpx;
}
.param-count {
  font-size: 22rpx;
  color: var(--accent);
  background-color: rgba(77, 166, 255, 0.08);
  border: 1px solid rgba(77, 166, 255, 0.3);
  border-radius: 999rpx;
  padding: 6rpx 18rpx;
  letter-spacing: 1rpx;
  flex-shrink: 0;
}
.project-remark {
  display: block;
  font-size: 26rpx;
  color: var(--text-2);
  margin-top: 16rpx;
  line-height: 1.5;
}
.card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid var(--line);
  padding-top: 20rpx;
  margin-top: 20rpx;
}
.project-time {
  font-size: 22rpx;
  color: var(--text-3);
}
.card-code {
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace;
  color: var(--accent);
  letter-spacing: 1rpx;
}
.card-go {
  display: flex;
  align-items: center;
}
.card-go-text {
  font-size: 22rpx;
  color: var(--text-2);
  margin-right: 6rpx;
}
.card-arrow {
  font-size: 36rpx;
  color: var(--accent);
  line-height: 1;
  margin-top: -4rpx;
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
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
    align-items: start;
  }
  .list-tip,
  .loading,
  .error,
  .empty,
  .list-end {
    grid-column: 1 / -1;
  }
  .project-card {
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
