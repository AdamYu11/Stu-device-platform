<template>
  <view class="page">
    <view class="a-header">
      <view class="a-head-left">
        <view class="back-btn" hover-class="btn-hover" @click="goBack">‹</view>
        <text class="a-title">{{ device ? device.brand + ' ' + device.model + ' 参数' : '设备参数' }}</text>
        <admin-nav current="device"></admin-nav>
      </view>
      <view class="a-actions">
        <view class="a-btn a-btn-ghost" hover-class="btn-hover" @click="applyTemplate">常用模板</view>
        <view class="a-btn a-btn-ghost" hover-class="btn-hover" @click="load">刷新</view>
        <view class="a-btn" hover-class="btn-hover" @click="save">保存全部</view>
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
        <view class="image-card">
          <view class="image-preview" v-if="device.image && !imgFail">
            <image class="image-thumb" :src="resolveImage(device.image)" mode="aspectFit" @error="imgFail = true"></image>
          </view>
          <view class="image-preview image-preview-fallback" v-else>
            <text class="image-fallback-icon">📱</text>
          </view>
          <view class="image-info">
            <text class="image-title">{{ device.brand }} {{ device.model }}</text>
            <text class="image-sub">缩略图将在手机参数页和测试数据详情中展示</text>
            <view class="image-actions">
              <view class="a-btn a-btn-ghost" hover-class="btn-hover" @click="chooseImage">上传图片</view>
              <view class="a-btn a-btn-ghost" hover-class="btn-hover" v-if="device.image" @click="removeImage">移除图片</view>
            </view>
          </view>
        </view>

        <view class="group-card" v-for="(group, gi) in groups" :key="gi">
          <view class="group-head">
            <text class="group-title">{{ group.title }}</text>
            <view class="group-actions">
              <text class="link" @click="renameGroup(gi)">重命名</text>
              <text class="link" @click="addItem(gi)">＋ 参数项</text>
              <text class="link link-danger" @click="removeGroup(gi)">删除分组</text>
            </view>
          </view>
          <view class="item-row" v-for="(item, ii) in group.items" :key="ii">
            <input class="field-input item-label-input" v-model="item.label" placeholder="参数名（如：电池容量）" placeholder-class="ph" />
            <input class="field-input" v-model="item.value" placeholder="参数值（如：6000mAh）" placeholder-class="ph" />
            <text class="link link-danger item-del" @click="group.items.splice(ii, 1)">删除</text>
          </view>
          <view class="group-empty" v-if="!group.items.length">暂无参数项</view>
        </view>

        <view class="add-group" hover-class="btn-hover" @click="addGroup">＋ 新增分组</view>

        <view class="a-btn save-btn" hover-class="btn-hover" @click="save">保存全部</view>
      </template>
    </view>

    <amodal :show="showRename" title="分组名称" @confirm="confirmRename" @cancel="showRename = false">
      <view class="field">
        <input class="field-input" v-model="renameValue" placeholder="如：基本信息" placeholder-class="ph" />
      </view>
    </amodal>
  </view>
</template>

<script>
import { adminGetDeviceInfo, adminSaveDeviceInfo, adminUpdateDevice, adminUploadImage, requireLogin } from '@/api/admin'
import { resolveImage } from '@/api'

// 常见手机参数分组与参数项（空值，直接填写即可）
const TEMPLATE_GROUPS = [
  { title: '基本信息', items: ['品牌', '型号', '处理器', 'GPU'] },
  { title: '屏幕', items: ['尺寸', '分辨率', '刷新率', '亮度'] },
  { title: '电池', items: ['电池容量', '充电功率'] },
  { title: '相机', items: ['主摄', '长焦', '超广角', '前置'] },
  { title: '系统与网络', items: ['操作系统', '网络制式', 'WiFi', '蓝牙'] },
  { title: '其他', items: ['重量', '传感器'] },
]

function templateGroups() {
  return TEMPLATE_GROUPS.map((g) => ({
    title: g.title,
    items: g.items.map((label) => ({ label, value: '' })),
  }))
}

export default {
  data() {
    return {
      id: '',
      loading: true,
      errorMsg: '',
      device: null,
      groups: [],
      imgFail: false,
      showRename: false,
      renameIndex: -1,
      renameValue: '',
    }
  },
  onLoad(options) {
    if (!requireLogin()) return
    this.id = options.id || ''
    this.load()
  },
  methods: {
    load() {
      this.loading = true
      this.errorMsg = ''
      adminGetDeviceInfo(this.id)
        .then((data) => {
          this.device = data
          if (data.groups && data.groups.length) {
            this.groups = data.groups.map((g) => ({
              title: g.title,
              items: g.items.map((i) => ({ label: i.label, value: i.value })),
            }))
          } else {
            // 新设备无参数：自动填入常用分组与参数项
            this.groups = templateGroups()
          }
        })
        .catch((err) => {
          this.errorMsg = err.message || '加载失败'
        })
        .finally(() => {
          this.loading = false
        })
    },
    applyTemplate() {
      uni.showModal({
        title: '常用模板',
        content: '用常用分组与参数项替换当前全部内容？',
        confirmText: '确定',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this.groups = templateGroups()
            uni.showToast({ title: '已填入模板', icon: 'success' })
          }
        },
      })
    },
    save() {
      adminSaveDeviceInfo(this.id, { groups: this.groups })
        .then(() => {
          uni.showToast({ title: '已保存', icon: 'success' })
        })
        .catch((err) => uni.showToast({ title: err.message || '保存失败', icon: 'none' }))
    },
    addGroup() {
      this.groups.push({ title: '新分组', items: [] })
    },
    removeGroup(gi) {
      uni.showModal({
        title: '删除确认',
        content: `确定删除分组「${this.groups[gi].title}」吗？`,
        confirmText: '删除',
        cancelText: '取消',
        confirmColor: '#ef4444',
        success: (res) => {
          if (res.confirm) this.groups.splice(gi, 1)
        },
      })
    },
    renameGroup(gi) {
      this.renameIndex = gi
      this.renameValue = this.groups[gi].title
      this.showRename = true
    },
    confirmRename() {
      if (this.renameIndex >= 0 && this.renameValue.trim()) {
        this.groups[this.renameIndex].title = this.renameValue.trim()
      }
      this.showRename = false
    },
    addItem(gi) {
      this.groups[gi].items.push({ label: '', value: '' })
    },
    resolveImage,
    chooseImage() {
      uni.chooseImage({
        count: 1,
        success: (res) => {
          const filePath = res.tempFilePaths[0]
          uni.showLoading({ title: '上传中...' })
          adminUploadImage(filePath)
            .then((url) => adminUpdateDevice(this.id, { image: url }))
            .then(() => adminGetDeviceInfo(this.id))
            .then((data) => {
              this.device = data
              this.imgFail = false
              uni.showToast({ title: '已上传', icon: 'success' })
            })
            .catch((err) => uni.showToast({ title: err.message || '上传失败', icon: 'none' }))
            .finally(() => uni.hideLoading())
        },
      })
    },
    removeImage() {
      uni.showModal({
        title: '移除图片',
        content: '确定移除该设备的缩略图吗？',
        confirmText: '移除',
        cancelText: '取消',
        confirmColor: '#ef4444',
        success: (res) => {
          if (!res.confirm) return
          adminUpdateDevice(this.id, { image: '' })
            .then(() => {
              this.device.image = ''
              this.imgFail = false
              uni.showToast({ title: '已移除', icon: 'success' })
            })
            .catch((err) => uni.showToast({ title: err.message || '操作失败', icon: 'none' }))
        },
      })
    },
    goBack() {
      uni.navigateBack()
    },
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
.back-btn {
  width: 60rpx;
  height: 60rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background-color: rgba(31, 36, 46, 0.65);
  border: 1px solid rgba(92, 179, 255, 0.2);
  font-size: 40rpx;
  color: #e6e8ee;
  margin-right: 20rpx;
  cursor: pointer;
}
.btn-hover {
  opacity: 0.8;
}
.a-btn-ghost {
  background-color: rgba(31, 36, 46, 0.65);
  border: 1px solid rgba(92, 179, 255, 0.2);
  color: #c3c9d6;
  margin-right: 20rpx;
}
.ph {
  color: #7c8598;
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

.group-card {
  background-color: rgba(24, 27, 34, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 28rpx;
}

.image-card {
  display: flex;
  align-items: center;
  background-color: rgba(24, 27, 34, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 28rpx;
}
.image-preview {
  width: 160rpx;
  height: 160rpx;
  border-radius: 24rpx;
  background-color: rgba(31, 36, 46, 0.65);
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 28rpx;
  flex-shrink: 0;
}
.image-thumb {
  width: 100%;
  height: 100%;
}
.image-fallback-icon {
  font-size: 64rpx;
}
.image-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.image-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #e6e8ee;
}
.image-sub {
  font-size: 22rpx;
  color: #9aa3b2;
  margin-top: 8rpx;
}
.image-actions {
  display: flex;
  margin-top: 16rpx;
}
.group-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 12rpx;
}
.group-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #e6e8ee;
}
.group-actions {
  display: flex;
  align-items: center;
}
.item-row {
  display: flex;
  align-items: center;
  padding: 12rpx 0;
}
.item-label-input {
  max-width: 340rpx;
  margin-right: 20rpx;
}
.item-del {
  margin-left: 24rpx;
}
.group-empty {
  padding: 16rpx 0;
  font-size: 24rpx;
  color: #7c8598;
}

.add-group {
  text-align: center;
  padding: 24rpx;
  border: 1px dashed #3a4356;
  border-radius: 16rpx;
  color: #9aa3b2;
  font-size: 28rpx;
  cursor: pointer;
  margin-bottom: 28rpx;
}
.save-btn {
  text-align: center;
  cursor: pointer;
}
</style>
