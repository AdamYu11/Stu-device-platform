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
            <text class="header-title">AI 助手</text>
            <text class="header-sub">ASK ANYTHING</text>
          </view>
        </view>
        <view class="clear-btn" hover-class="clear-btn-hover" @click="clearChat">
          <text class="clear-text">清空会话</text>
        </view>
      </view>
      <view class="header-line"></view>
    </view>

    <scroll-view class="chat-body" scroll-y :scroll-into-view="scrollInto" scroll-with-animation>
      <!-- 欢迎卡片 + 快捷提问 -->
      <view v-if="!messages.length" class="welcome tech-card">
        <view class="welcome-head">
          <view class="tech-dot"></view>
          <text class="welcome-title">我可以回答本数据库中的任何内容</text>
        </view>
        <text class="welcome-sub">设备参数、测试项目、测试记录……数据实时读取，点击下方问题直接提问：</text>
        <view class="quick-list">
          <view
            class="quick-item"
            v-for="(q, i) in quickQuestions"
            :key="i"
            hover-class="quick-item-hover"
            @click="send(q)"
          >
            <text class="quick-text">{{ q }}</text>
          </view>
        </view>
      </view>

      <!-- 消息列表 -->
      <view
        v-for="(m, i) in messages"
        :key="i"
        :id="'msg-' + i"
        class="msg-row"
        :class="m.role === 'user' ? 'msg-row-user' : 'msg-row-ai'"
      >
        <view class="msg-avatar" v-if="m.role === 'assistant'">🤖</view>
        <view class="bubble" :class="m.role === 'user' ? 'bubble-user' : 'bubble-ai'">
          <text class="bubble-text">{{ m.content }}</text>
        </view>
      </view>

      <!-- 思考中 -->
      <view v-if="loading" class="msg-row msg-row-ai" id="msg-loading">
        <view class="msg-avatar">🤖</view>
        <view class="bubble bubble-ai">
          <view class="typing">
            <view class="typing-dot"></view>
            <view class="typing-dot"></view>
            <view class="typing-dot"></view>
          </view>
        </view>
      </view>

      <view class="chat-end"></view>
    </scroll-view>

    <view class="input-bar">
      <input
        class="chat-input"
        v-model="draft"
        :disabled="loading"
        placeholder="问点什么，如：对比库里手机的电池容量"
        placeholder-class="input-placeholder"
        confirm-type="send"
        @confirm="send()"
      />
      <view
        class="send-btn"
        :class="{ 'send-btn-off': loading || !draft.trim() }"
        hover-class="send-btn-hover"
        @click="send()"
      >
        <text class="send-text">发送</text>
      </view>
    </view>

    <tabbar current="pages/ai/ai"></tabbar>
  </view>
</template>

<script>
import { aiChat } from '@/api/ai'

const HISTORY_KEY = 'ai_chat_history'
const HISTORY_MAX = 50 // 本地最多保存条数

export default {
  data() {
    return {
      draft: '',
      loading: false,
      messages: [],
      scrollInto: '',
      quickQuestions: [
        '库里有哪些设备？按品牌分类统计',
        '小米 15 Ultra 的屏幕和电池参数是什么？',
        '续航测试项目里哪台手机表现最好？',
        '对比一下 iPhone 16 Pro Max 和一加 15 的电池与充电',
      ],
    }
  },
  onLoad() {
    const saved = uni.getStorageSync(HISTORY_KEY)
    if (Array.isArray(saved)) this.messages = saved
    this.$nextTick(() => this.scrollToEnd())
  },
  methods: {
    send(preset) {
      const text = (preset || this.draft || '').trim()
      if (!text || this.loading) return
      this.draft = ''
      this.messages.push({ role: 'user', content: text })
      this.persist()
      this.scrollToEnd()
      this.ask()
    },
    ask() {
      this.loading = true
      this.scrollToEnd()
      aiChat(this.messages)
        .then((data) => {
          this.messages.push({ role: 'assistant', content: data.content })
        })
        .catch((err) => {
          this.messages.push({ role: 'assistant', content: '⚠️ ' + (err.message || '出错了，请重试') })
        })
        .finally(() => {
          this.loading = false
          this.persist()
          this.scrollToEnd()
        })
    },
    clearChat() {
      uni.showModal({
        title: '清空会话',
        content: '确定要清空当前对话记录吗？',
        success: (r) => {
          if (!r.confirm) return
          this.messages = []
          uni.removeStorageSync(HISTORY_KEY)
        },
      })
    },
    persist() {
      if (this.messages.length > HISTORY_MAX) {
        this.messages = this.messages.slice(-HISTORY_MAX)
      }
      uni.setStorageSync(HISTORY_KEY, this.messages)
    },
    scrollToEnd() {
      this.$nextTick(() => {
        this.scrollInto = this.loading ? 'msg-loading' : 'msg-' + (this.messages.length - 1)
      })
    },
  },
}
</script>

<style scoped>
.page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
}

/* ---------- 头部（与首页一致） ---------- */
.header {
  position: relative;
  z-index: 100;
  background-color: rgba(10, 14, 22, 0.82);
  border-bottom: 1rpx solid var(--line);
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
  border: 1rpx solid rgba(77, 166, 255, 0.38);
  box-shadow: 0 0 14px rgba(77, 166, 255, 0.18);
}
.brand-mark-core {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background-color: var(--accent-cyan);
  box-shadow: 0 0 10rpx rgba(53, 201, 238, 0.9);
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
.clear-btn {
  display: flex;
  align-items: center;
  padding: 10rpx 24rpx;
  border-radius: 999rpx;
  background-color: rgba(18, 26, 42, 0.7);
  border: 1rpx solid rgba(77, 166, 255, 0.28);
}
.clear-btn-hover {
  opacity: 0.7;
}
.clear-text {
  font-size: 26rpx;
  color: var(--text-2);
}

/* ---------- 消息区 ---------- */
.chat-body {
  flex: 1;
  height: 0;
  padding: 24rpx 24rpx 0;
  box-sizing: border-box;
}
.welcome {
  padding: 32rpx;
}
.welcome-head {
  display: flex;
  align-items: center;
}
.welcome-title {
  font-size: 30rpx;
  font-weight: 600;
  color: var(--text-1);
  margin-left: 14rpx;
}
.welcome-sub {
  display: block;
  font-size: 24rpx;
  color: var(--text-2);
  margin: 16rpx 0 24rpx;
  line-height: 1.6;
}
.quick-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}
.quick-item {
  padding: 20rpx 24rpx;
  border-radius: 12rpx;
  background-color: rgba(18, 26, 42, 0.7);
  border: 1rpx solid var(--line);
}
.quick-item-hover {
  border-color: var(--line-strong);
}
.quick-text {
  font-size: 26rpx;
  color: var(--accent);
}

.msg-row {
  display: flex;
  margin-top: 24rpx;
  align-items: flex-start;
}
.msg-row-user {
  justify-content: flex-end;
}
.msg-avatar {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  background-color: rgba(18, 26, 42, 0.85);
  border: 1rpx solid var(--line);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  flex-shrink: 0;
  margin-right: 14rpx;
}
.bubble {
  max-width: 78%;
  padding: 20rpx 26rpx;
  border-radius: 18rpx;
}
.bubble-ai {
  background: linear-gradient(165deg, rgba(24, 34, 52, 0.85), rgba(12, 17, 28, 0.9));
  border: 1rpx solid var(--line);
  border-top-left-radius: 6rpx;
}
.bubble-user {
  background: linear-gradient(135deg, rgba(47, 123, 255, 0.85), rgba(53, 201, 238, 0.75));
  border-top-right-radius: 6rpx;
}
.bubble-text {
  font-size: 28rpx;
  color: var(--text-1);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

/* 打字动画 */
.typing {
  display: flex;
  gap: 10rpx;
  padding: 6rpx 4rpx;
}
.typing-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: var(--accent);
  animation: typing-blink 1.2s infinite;
}
.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}
.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}
@keyframes typing-blink {
  0%,
  60%,
  100% {
    opacity: 0.25;
  }
  30% {
    opacity: 1;
  }
}

.chat-end {
  height: 40rpx;
}

/* ---------- 输入区 ---------- */
.input-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + 140rpx); /* 给 tabbar 留位 */
  background-color: rgba(10, 14, 22, 0.9);
  border-top: 1rpx solid var(--line);
}
.chat-input {
  flex: 1;
  height: 72rpx;
  padding: 0 26rpx;
  border-radius: 999rpx;
  background-color: #0a0e16;
  border: 1rpx solid var(--line);
  font-size: 28rpx;
  color: var(--text-1);
}
.input-placeholder {
  color: var(--text-3);
}
.send-btn {
  margin-left: 18rpx;
  padding: 0 36rpx;
  height: 72rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #2f7bff, #35c9ee);
  display: flex;
  align-items: center;
}
.send-btn-hover {
  opacity: 0.85;
}
.send-btn-off {
  opacity: 0.45;
}
.send-text {
  font-size: 28rpx;
  color: #fff;
}
</style>
