<template>
  <view class="page">
    <view class="a-header">
      <view class="a-head-left">
        <text class="a-title">测试数据管理</text>
        <admin-nav current="projects"></admin-nav>
      </view>
      <view class="a-actions">
        <view class="a-btn" hover-class="btn-hover" @click="openCreate">＋ 新增测试项目</view>
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
            <text class="th w-name">测试名称</text>
            <text class="th w-remark">备注</text>
            <text class="th w-count">机型数</text>
            <text class="th w-time">录入时间</text>
            <text class="th w-actions">操作</text>
          </view>
          <view class="tr" v-for="project in list" :key="project.id">
            <text class="td w-name">{{ project.name }}</text>
            <text class="td w-remark">{{ project.remark || '-' }}</text>
            <text class="td w-count">{{ project.recordCount }} 款</text>
            <text class="td w-time">{{ project.createdAt }}</text>
            <view class="td w-actions">
              <text class="link" @click="goRecords(project)">机型数据</text>
              <text class="link" @click="openEdit(project)">编辑</text>
              <text class="link link-danger" @click="remove(project)">删除</text>
            </view>
          </view>
          <view class="tr" v-if="!list.length">
            <text class="td">暂无测试项目，点击右上角「新增测试项目」</text>
          </view>
        </view>
      </template>
    </view>

    <amodal :show="showForm" :title="form.id ? '编辑测试项目' : '新增测试项目'" @confirm="submitForm" @cancel="showForm = false">
      <view class="field">
        <text class="field-label">测试名称 *</text>
        <input class="field-input" v-model="form.name" placeholder="如：续航测试 / 充电测试 / 信号测试" placeholder-class="ph" />
      </view>
      <view class="field">
        <text class="field-label">备注</text>
        <input class="field-input" v-model="form.remark" placeholder="选填，如测试环境说明" placeholder-class="ph" />
      </view>
    </amodal>
  </view>
</template>

<script>
import { adminGetProjects, adminCreateProject, adminUpdateProject, adminDeleteProject, requireLogin } from '@/api/admin'

export default {
  data() {
    return {
      loading: true,
      errorMsg: '',
      list: [],
      showForm: false,
      form: { id: 0, name: '', remark: '' },
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
      adminGetProjects()
        .then((list) => {
          this.list = list
        })
        .catch((err) => {
          this.errorMsg = err.message || '加载失败'
        })
        .finally(() => {
          this.loading = false
        })
    },
    openCreate() {
      this.form = { id: 0, name: '', remark: '' }
      this.showForm = true
    },
    openEdit(project) {
      this.form = { id: project.id, name: project.name, remark: project.remark }
      this.showForm = true
    },
    submitForm() {
      const data = { name: this.form.name.trim(), remark: this.form.remark.trim() }
      if (!data.name) {
        uni.showToast({ title: '测试名称必填', icon: 'none' })
        return
      }
      const req = this.form.id ? adminUpdateProject(this.form.id, data) : adminCreateProject(data)
      req
        .then(() => {
          this.showForm = false
          uni.showToast({ title: '已保存', icon: 'success' })
          this.load()
        })
        .catch((err) => uni.showToast({ title: err.message || '保存失败', icon: 'none' }))
    },
    remove(project) {
      uni.showModal({
        title: '删除确认',
        content: `确定删除测试项目「${project.name}」吗？其下所有机型测试数据将一并删除。`,
        confirmText: '删除',
        cancelText: '取消',
        confirmColor: '#ef4444',
        success: (res) => {
          if (!res.confirm) return
          adminDeleteProject(project.id)
            .then(() => {
              uni.showToast({ title: '已删除', icon: 'success' })
              this.load()
            })
            .catch((err) => uni.showToast({ title: err.message || '删除失败', icon: 'none' }))
        },
      })
    },
    goRecords(project) {
      uni.navigateTo({ url: '/pages/admin/project-records/project-records?id=' + project.id + '&name=' + encodeURIComponent(project.name) })
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
.w-name {
  width: 26%;
}
.w-remark {
  flex: 1;
}
.w-count {
  width: 12%;
}
.w-time {
  width: 22%;
}
.w-actions {
  width: 260rpx;
}
</style>
