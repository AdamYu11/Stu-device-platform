const express = require('express')
const router = express.Router()
const db = require('../db')

function deviceToJson(row) {
  const groups = db.prepare('SELECT * FROM device_groups WHERE device_id = ? ORDER BY sort ASC, id ASC').all(row.id)
  const itemCount = groups.reduce(
    (sum, g) => sum + db.prepare('SELECT COUNT(*) AS c FROM device_items WHERE group_id = ?').get(g.id).c,
    0
  )
  // 设备未单独上传缩略图时，回退使用品牌 Logo
  let image = row.image || ''
  if (!image) {
    const brand = db.prepare('SELECT image FROM brands WHERE name = ?').get(row.brand)
    if (brand && brand.image) image = brand.image
  }
  return {
    id: row.id,
    brand: row.brand,
    model: row.model,
    image,
    updatedAt: row.updated_at,
    groupCount: groups.length,
    itemCount,
  }
}

// GET /api/devices 设备列表
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM devices ORDER BY sort ASC, id ASC').all()
  res.json({ code: 0, data: rows.map(deviceToJson) })
})

// GET /api/devices/:id/info 设备参数详情
router.get('/:id/info', (req, res) => {
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id)
  if (!device) return res.json({ code: 1, message: '设备不存在' })
  const groups = db.prepare('SELECT * FROM device_groups WHERE device_id = ? ORDER BY sort ASC, id ASC').all(device.id)
  res.json({
    code: 0,
    data: {
      ...deviceToJson(device),
      groups: groups.map((g) => ({
        id: g.id,
        title: g.title,
        items: db
          .prepare('SELECT * FROM device_items WHERE group_id = ? ORDER BY sort ASC, id ASC')
          .all(g.id)
          .map((i) => ({ id: i.id, label: i.label, value: i.value })),
      })),
    },
  })
})

// ===== 以下接口需登录 =====
const auth = require('../auth')
router.use(auth)

// POST /api/devices 新增设备
router.post('/', (req, res) => {
  const b = req.body || {}
  if (!b.brand || !String(b.brand).trim()) return res.json({ code: 1, message: '品牌必填' })
  if (!b.model || !String(b.model).trim()) return res.json({ code: 1, message: '型号必填' })
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const info = db
    .prepare(`INSERT INTO devices (brand, model, image, updated_at, sort) VALUES (?, ?, ?, ?, (SELECT IFNULL(MAX(sort), 0) + 1 FROM devices))`)
    .run(String(b.brand).trim(), String(b.model).trim(), b.image ?? '', now)
  res.json({ code: 0, data: { id: info.lastInsertRowid } })
})

// PUT /api/devices/:id 修改设备基本信息（支持只传部分字段）
router.put('/:id', (req, res) => {
  const b = req.body || {}
  const device = db.prepare('SELECT * FROM devices WHERE id = ?').get(req.params.id)
  if (!device) return res.json({ code: 1, message: '设备不存在' })
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  db.prepare('UPDATE devices SET brand = ?, model = ?, image = ?, updated_at = ? WHERE id = ?').run(
    b.brand !== undefined ? b.brand : device.brand,
    b.model !== undefined ? b.model : device.model,
    b.image !== undefined ? b.image : device.image,
    now,
    req.params.id
  )
  res.json({ code: 0, data: { ok: true } })
})

// DELETE /api/devices/:id 删除设备（级联删除分组/参数/测试记录）
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM devices WHERE id = ?').run(req.params.id)
  res.json({ code: 0, data: { ok: true } })
})

// PUT /api/devices/:id/info 整体保存参数（管理后台提交）
router.put('/:id/info', (req, res) => {
  const b = req.body || {}
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  db.exec('BEGIN')
  try {
    db.prepare('UPDATE devices SET updated_at = ? WHERE id = ?').run(now, req.params.id)
    db.prepare('DELETE FROM device_items WHERE group_id IN (SELECT id FROM device_groups WHERE device_id = ?)').run(req.params.id)
    db.prepare('DELETE FROM device_groups WHERE device_id = ?').run(req.params.id)
    const insertGroup = db.prepare('INSERT INTO device_groups (device_id, title, sort) VALUES (?, ?, ?)')
    const insertItem = db.prepare('INSERT INTO device_items (group_id, label, value, sort) VALUES (?, ?, ?, ?)')
    ;(b.groups || []).forEach((g, gi) => {
      const { lastInsertRowid: groupId } = insertGroup.run(req.params.id, g.title ?? '', gi)
      ;(g.items || []).forEach((it, ii) => insertItem.run(groupId, it.label ?? '', it.value ?? '', ii))
    })
    db.exec('COMMIT')
    res.json({ code: 0, data: { ok: true } })
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
})

module.exports = router
