<template>
  <view class="page">
    <view class="a-header">
      <view class="a-head-left">
        <view class="back-btn" hover-class="btn-hover" @click="goBack">‹</view>
        <text class="a-title">{{ projectName }} — 机型测试数据</text>
        <admin-nav current="projects"></admin-nav>
      </view>
      <view class="a-actions">
        <view class="a-btn" hover-class="btn-hover" @click="openCreate">＋ 添加机型数据</view>
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
        <view class="record-card" v-for="record in records" :key="record.id">
          <view class="record-head">
            <view class="record-head-main">
              <text class="record-device" v-if="record.device">{{ record.device.brand }} {{ record.device.model }}</text>
              <text class="record-device record-device-missing" v-else>机型已删除</text>
              <text class="record-sub" v-if="record.device">{{ record.device.groupCount }} 组参数 · {{ record.device.itemCount }} 项</text>
            </view>
            <view class="record-actions">
              <text class="link" @click="openEdit(record)">编辑</text>
              <text class="link link-danger" @click="remove(record)">删除</text>
            </view>
          </view>
          <view class="record-params">
            <view class="record-param" v-for="p in record.params" :key="p.id !== undefined ? p.id : p.label">
              <text class="rp-label">{{ p.label }}</text>
              <text class="rp-value">{{ p.value }}</text>
            </view>
            <view class="record-params-empty" v-if="!record.params.length">暂无测试结果</view>
          </view>
        </view>

        <view class="empty" v-if="!records.length">
          <text class="empty-text">暂无机型数据，点击右上角「添加机型数据」</text>
        </view>
      </template>
    </view>

    <!-- 机型测试数据表单 -->
    <amodal :show="showForm" :title="form.id ? '编辑机型测试数据' : '添加机型测试数据'" @confirm="submitForm" @cancel="closeForm">
      <view class="field">
        <text class="field-label">选择机型 *</text>
        <view class="select-box" @click="toggleDropdown">
          <text class="picker-text" :class="{ 'picker-placeholder': !currentDeviceName }">{{ currentDeviceName || '请选择机型' }}</text>
          <text class="picker-arrow">{{ dropdownOpen ? '▴' : '▾' }}</text>
        </view>
        <view class="dropdown" v-if="dropdownOpen">
          <view
            class="dropdown-item"
            v-for="d in devices"
            :key="d.id"
            :class="{ 'dropdown-active': d.id === form.deviceId }"
            @click="pickDevice(d)"
          >
            <text class="dropdown-text">{{ d.brand }} {{ d.model }}</text>
            <text class="dropdown-count">{{ d.groupCount }} 组 · {{ d.itemCount }} 项</text>
          </view>
          <view class="dropdown-empty" v-if="!devices.length">暂无设备，请先在手机参数管理中添加</view>
        </view>
      </view>
      <view class="field">
        <view class="param-form-head">
          <text class="field-label">测试结果</text>
          <text class="link" @click="addParam">＋ 添加</text>
        </view>
        <text class="preset-hint" v-if="form.params.length">结果名已按该项目已有记录预设，直接填写结果值即可</text>
        <view class="param-row" v-for="(p, i) in form.params" :key="i">
          <input class="field-input param-label" v-model="p.label" placeholder="结果名（如：剩余电量）" placeholder-class="ph" />
          <input class="field-input" v-model="p.value" placeholder="结果值（如：78%）" placeholder-class="ph" />
          <text class="link link-danger param-del" @click="form.params.splice(i, 1)">删</text>
        </view>
      </view>
    </amodal>
  </view>
</template>

<script>
import { adminGetProject, adminGetDevices, adminCreateRecord, adminUpdateRecord, adminDeleteRecord, requireLogin } from '@/api/admin'

export default {
  data() {
    return {
      id: '',
      projectName: '',
      loading: true,
      errorMsg: '',
      records: [],
      devices: [],
      showForm: false,
      dropdownOpen: false,
      form: { id: 0, deviceId: 0, params: [] },
    }
  },
  computed: {
    currentDeviceName() {
      const d = this.devices.find((x) => x.id === this.form.deviceId)
      return d ? d.brand + ' ' + d.model : ''
    },
  },
  onLoad(options) {
    if (!requireLogin()) return
    this.id = options.id || ''
    this.projectName = decodeURIComponent(options.name || '')
    this.load()
  },
  methods: {
    load() {
      this.loading = true
      this.errorMsg = ''
      Promise.all([adminGetProject(this.id), adminGetDevices()])
        .then(([data, devices]) => {
          this.records = data.records || []
          this.devices = devices
        })
        .catch((err) => {
          this.errorMsg = err.message || '加载失败'
        })
        .finally(() => {
          this.loading = false
        })
    },
    openCreate() {
      if (!this.devices.length) {
        uni.showToast({ title: '请先在手机参数管理中添加设备', icon: 'none' })
        return
      }
      // 基于该项目已有记录，预设测试结果名（值留空填写）
      let params = []
      const first = this.records.find((r) => r.params && r.params.length)
      if (first) {
        params = first.params.map((p) => ({ label: p.label, value: '' }))
      }
      this.form = { id: 0, deviceId: this.devices[0].id, params }
      this.dropdownOpen = false
      this.showForm = true
    },
    openEdit(record) {
      this.form = {
        id: record.id,
        deviceId: record.device ? record.device.id : 0,
        params: (record.params || []).map((p) => ({ label: p.label, value: p.value })),
      }
      this.dropdownOpen = false
      this.showForm = true
    },
    closeForm() {
      this.showForm = false
      this.dropdownOpen = false
    },
    toggleDropdown() {
      this.dropdownOpen = !this.dropdownOpen
    },
    pickDevice(device) {
      this.form.deviceId = device.id
      this.dropdownOpen = false
    },
    addParam() {
      this.form.params.push({ label: '', value: '' })
    },
    submitForm() {
      if (!this.form.deviceId) {
        uni.showToast({ title: '请选择机型', icon: 'none' })
        return
      }
      const data = {
        deviceId: this.form.deviceId,
        params: this.form.params
          .map((p) => ({ label: p.label.trim(), value: p.value.trim() }))
          .filter((p) => p.label || p.value),
      }
      const req = this.form.id ? adminUpdateRecord(this.form.id, data) : adminCreateRecord(this.id, data)
      req
        .then(() => {
          this.showForm = false
          uni.showToast({ title: '已保存', icon: 'success' })
          this.load()
        })
        .catch((err) => uni.showToast({ title: err.message || '保存失败', icon: 'none' }))
    },
    remove(record) {
      const name = record.device ? record.device.brand + ' ' + record.device.model : '该条'
      uni.showModal({
        title: '删除确认',
        content: `确定删除「${name}」的测试数据吗？`,
        confirmText: '删除',
        cancelText: '取消',
        confirmColor: '#ef4444',
        success: (res) => {
          if (!res.confirm) return
          adminDeleteRecord(record.id)
            .then(() => {
              uni.showToast({ title: '已删除', icon: 'success' })
              this.load()
            })
            .catch((err) => uni.showToast({ title: err.message || '删除失败', icon: 'none' }))
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

.record-card {
  background-color: rgba(24, 27, 34, 0.78);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  margin-bottom: 24rpx;
}
.record-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16rpx;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  margin-bottom: 12rpx;
}
.record-head-main {
  display: flex;
  flex-direction: column;
}
.record-device {
  font-size: 30rpx;
  font-weight: 600;
  color: #e6e8ee;
}
.record-device-missing {
  color: #ef4444;
}
.record-sub {
  font-size: 22rpx;
  color: #9aa3b2;
  margin-top: 6rpx;
}
.record-actions {
  display: flex;
  align-items: center;
}
.record-params {
  display: flex;
  flex-wrap: wrap;
}
.record-param {
  display: flex;
  align-items: baseline;
  background-color: rgba(31, 36, 46, 0.65);
  border: 1px solid rgba(92, 179, 255, 0.2);
  border-radius: 12rpx;
  padding: 10rpx 20rpx;
  margin: 0 16rpx 16rpx 0;
}
.rp-label {
  font-size: 22rpx;
  color: #9aa3b2;
  margin-right: 10rpx;
}
.rp-value {
  font-size: 24rpx;
  color: #e6e8ee;
  font-weight: 600;
}
.record-params-empty {
  font-size: 24rpx;
  color: #7c8598;
  padding: 12rpx 0;
}
.empty {
  display: flex;
  justify-content: center;
  padding: 120rpx 0;
}
.empty-text {
  font-size: 26rpx;
  color: #7c8598;
}

.select-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background-color: rgba(15, 17, 21, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  cursor: pointer;
}
.picker-text {
  font-size: 28rpx;
  color: #e6e8ee;
}
.picker-placeholder {
  color: #7c8598;
}
.picker-arrow {
  font-size: 28rpx;
  color: #9aa3b2;
}
.dropdown {
  margin-top: 8rpx;
  background-color: rgba(31, 36, 46, 0.65);
  border: 1px solid rgba(92, 179, 255, 0.2);
  border-radius: 12rpx;
  max-height: 360rpx;
  overflow-y: auto;
}
.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 24rpx;
  cursor: pointer;
  border-bottom: 1px solid #2c3342;
}
.dropdown-item:last-child {
  border-bottom: none;
}
.dropdown-item:hover {
  background-color: #262b36;
}
.dropdown-active {
  background-color: rgba(92, 179, 255, 0.12);
}
.dropdown-text {
  font-size: 28rpx;
  color: #e6e8ee;
}
.dropdown-active .dropdown-text {
  color: #5cb3ff;
}
.dropdown-count {
  font-size: 22rpx;
  color: #9aa3b2;
}
.dropdown-empty {
  padding: 20rpx;
  font-size: 24rpx;
  color: #7c8598;
}
.param-form-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.preset-hint {
  display: block;
  font-size: 22rpx;
  color: #9aa3b2;
  margin-bottom: 16rpx;
}
.param-row {
  display: flex;
  align-items: center;
  margin-bottom: 16rpx;
}
.param-label {
  max-width: 300rpx;
  margin-right: 16rpx;
}
.param-del {
  margin-left: 16rpx;
}
</style>
