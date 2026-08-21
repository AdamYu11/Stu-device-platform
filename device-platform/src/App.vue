<script>
export default {
  onLaunch: function () {
    console.log('App Launch')
  },
  onShow: function () {
    console.log('App Show')
  },
  onHide: function () {
    console.log('App Hide')
  },
}
</script>

<style>
/* ============================================================
   全局设计令牌 · 科技感护眼深色
   护眼原则：
   1. 底色用深蓝灰而非纯黑，避免"死黑"与眩光
   2. 正文用柔和高亮灰，不用纯白，降低对比刺眼度
   3. 强调色只做小面积点缀（边角、状态点、关键数据）
   4. 大面积信息面用低饱和表面，靠描边/微光区分层次
   ============================================================ */
page {
  /* 颜色令牌 */
  --bg: #0a0e16;
  --surface-1: #121a2a;
  --surface-2: #182236;
  --text-1: #d8e0ec;
  --text-2: #8fa2b8;
  --text-3: #5e6b80;
  --accent: #4da6ff;
  --accent-cyan: #35c9ee;
  --accent-green: #3ecf9e;
  --line: rgba(122, 162, 220, 0.13);
  --line-strong: rgba(90, 175, 255, 0.32);

  background-color: #0a0e16;
  /* 网格线 + 光晕背景 */
  background-image:
    linear-gradient(rgba(100, 146, 212, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(100, 146, 212, 0.05) 1px, transparent 1px),
    radial-gradient(58% 42% at 12% -2%, rgba(45, 120, 255, 0.14), transparent 62%),
    radial-gradient(46% 36% at 96% 4%, rgba(35, 199, 236, 0.06), transparent 58%),
    radial-gradient(65% 48% at 50% 112%, rgba(59, 130, 246, 0.08), transparent 64%);
  background-size: 44px 44px, 44px 44px, 100% 100%, 100% 100%, 100% 100%;
  background-repeat: repeat, repeat, no-repeat, no-repeat, no-repeat;
  color: var(--text-1);
  font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Helvetica,
    'PingFang SC', 'Microsoft YaHei', sans-serif;
}

/* #ifdef H5 */
page {
  background-attachment: fixed;
}
/* 毛玻璃：主要表面统一模糊与光晕（H5 独有） */
.header,
.tabbar,
.a-header,
.table,
.amodal-box,
.login-box,
.project-card,
.brand-card,
.device-card,
.record-card,
.group-card,
.hero-card,
.spec-card,
.note-card,
.form-card,
.params-card,
.basic-card,
.image-card,
.tech-card {
  backdrop-filter: blur(14px) saturate(1.3);
  -webkit-backdrop-filter: blur(14px) saturate(1.3);
}
/* #endif */

/* ============ 科技卡片：渐变表面 + HUD 边角括号 ============ */
.tech-card {
  position: relative;
  background: linear-gradient(165deg, rgba(24, 34, 52, 0.68), rgba(12, 17, 28, 0.86));
  border: 1px solid var(--line);
  border-radius: 20rpx;
  box-shadow: 0 6px 24px rgba(3, 7, 16, 0.45), inset 0 1px 0 rgba(148, 190, 255, 0.07);
}
.tech-card::before,
.tech-card::after {
  content: '';
  position: absolute;
  width: 22rpx;
  height: 22rpx;
  z-index: 1;
  pointer-events: none;
}
/* 左上角括号（高亮） */
.tech-card::before {
  top: -1rpx;
  left: -1rpx;
  border-top: 3rpx solid rgba(77, 166, 255, 0.85);
  border-left: 3rpx solid rgba(77, 166, 255, 0.85);
  border-top-left-radius: 18rpx;
}
/* 右下角括号（弱化） */
.tech-card::after {
  bottom: -1rpx;
  right: -1rpx;
  border-bottom: 3rpx solid rgba(53, 201, 238, 0.5);
  border-right: 3rpx solid rgba(53, 201, 238, 0.5);
  border-bottom-right-radius: 18rpx;
}

/* #ifdef H5 */
/* 桌面端卡片悬停浮起 + 蓝色光晕 */
@media (min-width: 768px) {
  .tech-card {
    cursor: pointer;
    transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  }
  .tech-card:hover {
    transform: translateY(-4px);
    border-color: var(--line-strong);
    box-shadow: 0 12px 32px rgba(3, 7, 16, 0.55), 0 0 0 1px rgba(77, 166, 255, 0.1),
      0 0 26px rgba(77, 166, 255, 0.1);
  }
}
/* #endif */

/* ============ 状态指示灯（呼吸脉冲） ============ */
.tech-dot {
  position: relative;
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background-color: var(--accent-cyan);
  box-shadow: 0 0 8px rgba(53, 201, 238, 0.7);
  flex-shrink: 0;
}
.tech-dot::after {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background-color: rgba(53, 201, 238, 0.5);
  animation: tech-ping 2.2s ease-out infinite;
}
@keyframes tech-ping {
  0% {
    transform: scale(1);
    opacity: 0.7;
  }
  80%,
  100% {
    transform: scale(2.8);
    opacity: 0;
  }
}

/* ============ HUD 扫描线（hero 卡扫过效果） ============ */
.scanline {
  position: absolute;
  left: 0;
  right: 0;
  height: 2rpx;
  background: linear-gradient(90deg, transparent, rgba(77, 166, 255, 0.5), transparent);
  animation: tech-scan 3.4s ease-in-out infinite;
  pointer-events: none;
  z-index: 2;
}
@keyframes tech-scan {
  0% {
    top: 6%;
    opacity: 0;
  }
  10% {
    opacity: 1;
  }
  48% {
    top: 94%;
    opacity: 0.85;
  }
  60% {
    opacity: 0;
  }
  100% {
    top: 6%;
    opacity: 0;
  }
}

/* ============ 数据值字体：等宽数字，参数更整齐 ============ */
.tech-value {
  font-family: 'SF Mono', ui-monospace, Menlo, Consolas, 'Courier New', monospace;
  font-variant-numeric: tabular-nums;
}

/* ============ 小标签 ============ */
.tech-tag {
  display: inline-flex;
  align-items: center;
  font-size: 22rpx;
  color: var(--accent);
  background-color: rgba(77, 166, 255, 0.08);
  border: 1px solid rgba(77, 166, 255, 0.28);
  border-radius: 999rpx;
  padding: 6rpx 18rpx;
  letter-spacing: 1rpx;
}

/* 管理后台通用样式（仅 H5 管理页使用） */
.a-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 36rpx 40rpx;
  border-bottom: 1px solid var(--line);
  background-color: rgba(10, 14, 22, 0.85);
}
/* #ifdef H5 */
.a-header {
  padding-top: calc(36rpx + env(safe-area-inset-top));
}
/* 手机端管理页：表格横向滚动、窄屏幕单列布局 */
@media (max-width: 767px) {
  .table {
    overflow-x: auto;
  }
  .tr {
    min-width: 760px;
  }
  .a-header {
    flex-wrap: wrap;
  }
}
/* #endif */
.a-title {
  font-size: 40rpx;
  font-weight: 700;
  color: var(--text-1);
}
.a-actions {
  display: flex;
  align-items: center;
}
.a-btn {
  padding: 16rpx 36rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, #2f7bff, #35c9ee);
  color: #ffffff;
  font-size: 28rpx;
  cursor: pointer;
}
.a-btn-ghost {
  background-color: rgba(18, 26, 42, 0.7);
  border: 1px solid rgba(77, 166, 255, 0.28);
  color: var(--text-2);
  margin-right: 20rpx;
}
.a-body {
  max-width: 1200px;
  margin: 0 auto;
  padding: 32rpx 40rpx 80rpx;
}

/* 表格 */
.table {
  background-color: rgba(18, 26, 42, 0.78);
  border: 1px solid var(--line);
  border-radius: 16rpx;
  overflow: hidden;
}
.tr {
  display: flex;
  align-items: center;
  padding: 0 24rpx;
  border-bottom: 1px solid rgba(122, 162, 220, 0.08);
}
.tr:last-child {
  border-bottom: none;
}
.tr-th {
  background-color: rgba(24, 34, 52, 0.6);
  padding: 20rpx 24rpx;
}
.th {
  font-size: 24rpx;
  color: var(--text-2);
}
.td {
  font-size: 26rpx;
  color: var(--text-1);
  padding: 22rpx 0;
  margin-right: 16rpx;
  word-break: break-all;
}
.link {
  font-size: 26rpx;
  color: var(--accent);
  margin-right: 28rpx;
  cursor: pointer;
}
.link-danger {
  color: #f48a8a;
}

/* 表单 */
.field {
  display: flex;
  flex-direction: column;
  margin-bottom: 24rpx;
}
.field-label {
  font-size: 24rpx;
  color: var(--text-2);
  margin-bottom: 10rpx;
}
.field-input {
  background-color: #0a0e16;
  border: 1px solid var(--line);
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  color: var(--text-1);
}
.form-row2 {
  display: flex;
}
.form-row2 .field {
  flex: 1;
}
.form-row2 .field + .field {
  margin-left: 24rpx;
}
</style>
