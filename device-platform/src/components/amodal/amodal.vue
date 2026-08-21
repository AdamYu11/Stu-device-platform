<template>
  <view class="amodal" v-if="show">
    <view class="amodal-mask" @click="cancel"></view>
    <view class="amodal-box">
      <view class="amodal-head">
        <text class="amodal-title">{{ title }}</text>
        <text class="amodal-close" @click="cancel">✕</text>
      </view>
      <view class="amodal-body">
        <slot></slot>
      </view>
      <view class="amodal-foot">
        <view class="btn btn-cancel" hover-class="btn-hover" @click="cancel">取消</view>
        <view class="btn btn-confirm" hover-class="btn-hover" @click="confirm">确定</view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'amodal',
  props: {
    show: { type: Boolean, default: false },
    title: { type: String, default: '' },
  },
  emits: ['confirm', 'cancel'],
  methods: {
    confirm() {
      this.$emit('confirm')
    },
    cancel() {
      this.$emit('cancel')
    },
  },
}
</script>

<style>
.amodal {
  position: fixed;
  inset: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}
.amodal-mask {
  position: absolute;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.6);
}
.amodal-box {
  position: relative;
  width: 680rpx;
  max-width: 90vw;
  max-height: 84vh;
  background-color: rgba(24, 27, 34, 0.78);
  border: 1px solid rgba(92, 179, 255, 0.2);
  border-radius: 20rpx;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
.amodal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 28rpx 32rpx;
  border-bottom: 1px solid #262b36;
}
.amodal-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #e6e8ee;
}
.amodal-close {
  font-size: 30rpx;
  color: #9aa3b2;
  padding: 8rpx;
}
.amodal-body {
  padding: 28rpx 32rpx;
  overflow-y: auto;
}
.amodal-foot {
  display: flex;
  justify-content: flex-end;
  padding: 24rpx 32rpx;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}
.btn {
  padding: 14rpx 44rpx;
  border-radius: 999rpx;
  font-size: 28rpx;
  border: 1px solid rgba(92, 179, 255, 0.2);
}
.btn-hover {
  opacity: 0.8;
}
.btn-cancel {
  color: #c3c9d6;
  background-color: rgba(31, 36, 46, 0.65);
  margin-right: 20rpx;
}
.btn-confirm {
  color: #ffffff;
  background: linear-gradient(135deg, #3d7ef5, #5cb3ff);
  border-color: #5cb3ff;
}
</style>
