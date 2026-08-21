/**
 * AI 助手路由
 * POST /api/ai/chat  { messages: [{role:'user'|'assistant', content}] }
 *
 * 原理：SQLite 全量数据 → 知识文本 → 注入 system prompt → 转发大模型（OpenAI 兼容接口）
 * 零新增依赖：使用 Node 18+ 原生 fetch
 *
 * 环境变量（见 .env）：
 *   AI_API_KEY         必填，大模型 API Key（DeepSeek/智谱/OpenAI 兼容均可）
 *   AI_BASE_URL        选填，默认智谱 https://open.bigmodel.cn/api/paas/v4
 *   AI_MODEL           选填，默认 glm-4-flash
 *   AI_REQUIRE_AUTH    选填，置 1 = 需管理员登录后才能使用（公开部署建议开启）
 */
const express = require('express')
const db = require('../db')

const router = express.Router()

// ===== 配置（环境变量优先）=====
const AI_API_KEY = process.env.AI_API_KEY || ''
const AI_BASE_URL = (process.env.AI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4').replace(/\/+$/, '')
const AI_MODEL = process.env.AI_MODEL || 'glm-4-flash'
const AI_REQUIRE_AUTH = process.env.AI_REQUIRE_AUTH === '1'
const MAX_HISTORY = 20 // 携带的最大历史消息条数
const MAX_QPM = 10 // 每 IP 每分钟最多提问次数
const RATE_WINDOW = 60 * 1000

// 可选开启登录校验（防止陌生人刷 API key）
if (AI_REQUIRE_AUTH) router.use(require('../auth'))

// ============================================================
// ① SQLite → 知识文本（每次提问实时构建，答案永远基于最新数据）
//    表结构：devices / device_groups / device_items
//           test_projects / project_records / record_params
// ============================================================
function buildKnowledge() {
  const parts = []

  // —— 设备库（含完整参数树）——
  const devices = db.prepare('SELECT id, brand, model FROM devices ORDER BY sort ASC, id ASC').all()
  parts.push(`【设备库】共 ${devices.length} 台设备`)
  devices.forEach((d) => {
    const groups = db
      .prepare('SELECT id, title FROM device_groups WHERE device_id = ? ORDER BY sort ASC, id ASC')
      .all(d.id)
    if (!groups.length) {
      parts.push(`- ${d.brand} ${d.model}（暂无参数）`)
      return
    }
    const lines = [`- ${d.brand} ${d.model}`]
    groups.forEach((g) => {
      const items = db
        .prepare('SELECT label, value FROM device_items WHERE group_id = ? ORDER BY sort ASC, id ASC')
        .all(g.id)
      if (!items.length) return
      lines.push(`  · ${g.title}：` + items.map((i) => `${i.label}=${i.value}`).join('；'))
    })
    parts.push(lines.join('\n'))
  })

  // —— 测试项目（含记录与参数）——
  const projects = db.prepare('SELECT id, name, remark FROM test_projects ORDER BY sort ASC, id ASC').all()
  parts.push(`\n【测试项目】共 ${projects.length} 个项目`)
  projects.forEach((p) => {
    const lines = [`- 项目「${p.name}」${p.remark ? '（' + p.remark + '）' : ''}`]
    const records = db
      .prepare('SELECT id, device_id FROM project_records WHERE project_id = ? ORDER BY sort ASC, id ASC')
      .all(p.id)
    if (!records.length) {
      lines.push('  · 暂无测试记录')
    } else {
      records.forEach((r) => {
        const dev = db.prepare('SELECT brand, model FROM devices WHERE id = ?').get(r.device_id)
        const devName = dev ? `${dev.brand} ${dev.model}` : '（设备已删除）'
        const params = db
          .prepare('SELECT label, value FROM record_params WHERE record_id = ? ORDER BY sort ASC, id ASC')
          .all(r.id)
        const pText = params.length ? params.map((x) => `${x.label}=${x.value}`).join('；') : '无参数'
        lines.push(`  · ${devName}：${pText}`)
      })
    }
    parts.push(lines.join('\n'))
  })

  return parts.join('\n')
}

// ============================================================
// ② 简单内存限流（防刷 key；重启即清空，够用）
// ============================================================
const hits = new Map() // ip -> [时间戳]
function hitLimit(ip) {
  const nowTs = Date.now()
  const list = (hits.get(ip) || []).filter((t) => nowTs - t < RATE_WINDOW)
  if (list.length >= MAX_QPM) {
    hits.set(ip, list)
    return true
  }
  list.push(nowTs)
  hits.set(ip, list)
  if (hits.size > 5000) hits.clear() // 防内存膨胀
  return false
}

// ============================================================
// ③ 对话接口
// ============================================================
router.post('/chat', async (req, res) => {
  try {
    if (!AI_API_KEY) {
      return res.json({ code: 1, message: 'AI 未配置：请在 device-platform-server/.env 中设置 AI_API_KEY 后重启服务' })
    }
    if (hitLimit(req.ip)) {
      return res.status(429).json({ code: 429, message: '提问太频繁，请稍后再试' })
    }

    // 校验并截断历史
    const raw = (req.body && req.body.messages) || []
    const history = raw
      .filter(
        (m) =>
          m &&
          (m.role === 'user' || m.role === 'assistant') &&
          typeof m.content === 'string' &&
          m.content.trim()
      )
      .slice(-MAX_HISTORY)
      .map((m) => ({ role: m.role, content: m.content.trim().slice(0, 4000) }))
    if (!history.length) return res.json({ code: 1, message: 'messages 不能为空' })

    const system = [
      '你是「谦哥数码数据库」内置的 AI 助手，负责回答本系统数据相关的问题。',
      '系统说明：这是一个数码设备测试数据平台，管理手机等设备的详细参数，以及各类测试项目（如续航测试、充电测试）和对应的测试记录。',
      '回答规则：',
      '1. 只依据下方【数据库快照】回答，禁止编造数据；',
      '2. 快照中没有的信息，明确告知"数据库中没有该信息"；',
      '3. 用中文简洁回答，涉及多设备对比时可用列表呈现；',
      '4. 可以做基于快照数据的简单计算与总结（如差值、排名、统计）。',
      '',
      '【数据库快照】',
      buildKnowledge(),
    ].join('\n')

    const resp = await fetch(AI_BASE_URL + '/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + AI_API_KEY,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: 'system', content: system }, ...history],
        temperature: 0.3,
        max_tokens: 1024,
      }),
      signal: AbortSignal.timeout(60000), // 60s 超时
    })

    if (!resp.ok) {
      const detail = await resp.text().catch(() => '')
      console.error('[ai] 上游错误', resp.status, detail.slice(0, 300))
      return res.json({ code: 1, message: `AI 服务返回错误(${resp.status})，请检查 AI_API_KEY / AI_MODEL 配置` })
    }

    const data = await resp.json()
    const content =
      data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content
    if (!content) return res.json({ code: 1, message: 'AI 未返回内容，请重试' })

    res.json({ code: 0, data: { content: content.trim() } })
  } catch (e) {
    const msg =
      e && e.name === 'TimeoutError'
        ? 'AI 响应超时，请重试'
        : 'AI 请求失败：' + (e.message || '未知错误')
    res.json({ code: 1, message: msg })
  }
})

module.exports = router
