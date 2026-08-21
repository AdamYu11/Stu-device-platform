<template>
  <view class="tabbar" :class="{ 'tabbar-desktop-only': desktopOnly }">
    <!-- #ifdef H5 -->
    <view class="tabbar-brand">谦哥数码数据库</view>
    <!-- #endif -->
    <view
      class="tabbar-item"
      :class="{ 'tabbar-item-active': item.path === current }"
      v-for="item in tabList"
      :key="item.path"
      hover-class="tabbar-item-hover"
      @click="switchTab(item)"
    >
      <text class="tabbar-icon">{{ item.icon }}</text>
      <text class="tabbar-text" :class="{ 'tabbar-text-active': item.path === current }">{{ item.text }}</text>
    </view>
    <!-- #ifdef H5 -->
    <view class="tabbar-item tabbar-admin" hover-class="tabbar-item-hover" @click="goAdmin">
      <text class="tabbar-icon">⚙️</text>
      <text class="tabbar-text">管理</text>
    </view>
    <!-- #endif -->
  </view>
</template>

<script>
export default {
  name: 'custom-tabbar',
  props: {
    // 当前激活的页面路径
    current: {
      type: String,
      default: '',
    },
    // 仅桌面端(H5 宽屏)显示，移动端隐藏（用于详情等二级页面）
    desktopOnly: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      tabList: [
        { path: 'pages/index/index', text: '测试数据', icon: '📊' },
        { path: 'pages/device/device', text: '手机参数', icon: '📱' },
        { path: 'pages/ai/ai', text: 'AI 助手', icon: '🤖' },
      ],
    }
  },
  methods: {
    switchTab(item) {
      if (item.path === this.current) return
      // 使用 reLaunch，H5 与微信小程序均可用，无需原生 tabBar 配置
      uni.reLaunch({
        url: '/' + item.path,
      })
    },
    // #ifdef H5
    goAdmin() {
      uni.navigateTo({ url: '/pages/admin/projects/projects' })
    },
    // #endif
  },
}
</script>

<style>
.tabbar {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  background-color: rgba(10, 14, 22, 0.85);
  border-top: 1px solid var(--line);
  box-shadow: 0 -4px 16px rgba(0, 0, 0, 0.4);
  padding-bottom: constant(safe-area-inset-bottom);
  padding-bottom: env(safe-area-inset-bottom);
  z-index: 999;
}

/* 二级页面：移动端隐藏，桌面端显示为顶部导航 */
.tabbar-desktop-only {
  display: none;
}

/* 品牌名：移动端底部导航不显示，仅桌面端顶部导航显示 */
.tabbar-brand {
  display: none;
}

.tabbar-item {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16rpx 0 12rpx;
}

.tabbar-item-hover {
  background-color: rgba(18, 26, 42, 0.6);
}

/* 激活指示条 */
.tabbar-item-active::before {
  content: '';
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 56rpx;
  height: 4rpx;
  border-radius: 0 0 4rpx 4rpx;
  background: linear-gradient(90deg, rgba(77, 166, 255, 0.3), #4da6ff, rgba(53, 201, 238, 0.3));
  box-shadow: 0 0 10px rgba(77, 166, 255, 0.45);
}

.tabbar-icon {
  font-size: 44rpx;
  line-height: 1;
}

.tabbar-text {
  font-size: 22rpx;
  color: var(--text-2);
  margin-top: 8rpx;
}

.tabbar-text-active {
  color: var(--accent);
}

/* 管理入口：仅桌面端 H5 显示 */
.tabbar-admin {
  display: none;
}

/* #ifdef H5 */
/* 桌面端：tabbar 变为顶部导航栏 */
@media (min-width: 768px) {
  .tabbar {
    top: 0;
    bottom: auto;
    left: 0;
    right: 0;
    height: 64px;
    flex-direction: row;
    align-items: center;
    padding-bottom: 0;
    border-top: none;
    border-bottom: 1px solid var(--line);
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.4);
  }

  .tabbar-desktop-only {
    display: flex;
  }

  .tabbar-brand {
    display: flex;
    align-items: center;
    height: 100%;
    padding: 0 32px;
    font-size: 18px;
    font-weight: 700;
    letter-spacing: 1px;
    margin-right: auto;
    color: var(--accent);
    background: linear-gradient(90deg, #8cc3ff, #35c9ee);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }

  .tabbar-item {
    flex: 0 0 auto;
    flex-direction: row;
    height: 100%;
    padding: 0 28px;
    cursor: pointer;
  }

  .tabbar-item-hover {
    background-color: rgba(18, 26, 42, 0.6);
  }

  .tabbar-item-active::before {
    top: auto;
    bottom: 0;
    width: 64rpx;
    height: 4rpx;
    border-radius: 4rpx 4rpx 0 0;
    background: linear-gradient(90deg, rgba(77, 166, 255, 0.3), #4da6ff, rgba(53, 201, 238, 0.3));
  }

  .tabbar-icon {
    font-size: 20px;
    margin-right: 8px;
  }

  .tabbar-text {
    font-size: 15px;
    margin-top: 0;
  }

  .tabbar-admin {
    display: flex;
  }
}
/* #endif */
</style>
