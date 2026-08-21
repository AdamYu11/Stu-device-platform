const express = require('express')
const router = express.Router()
const db = require('../db')

function deviceInfo(deviceId) {
  const d = db.prepare('SELECT * FROM devices WHERE id = ?').get(deviceId)
  if (!d) return null
  const groups = db.prepare('SELECT * FROM device_groups WHERE device_id = ? ORDER BY sort ASC, id ASC').all(d.id)
  // 设备未单独上传缩略图时，回退使用品牌 Logo
  let image = d.image || ''
  if (!image) {
    const brand = db.prepare('SELECT image FROM brands WHERE name = ?').get(d.brand)
    if (brand && brand.image) image = brand.image
  }
  return {
    id: d.id,
    brand: d.brand,
    model: d.model,
    image,
    updatedAt: d.updated_at,
    groups: groups.map((g) => ({
      id: g.id,
      title: g.title,
      items: db
        .prepare('SELECT * FROM device_items WHERE group_id = ? ORDER BY sort ASC, id ASC')
        .all(g.id)
        .map((i) => ({ id: i.id, label: i.label, value: i.value })),
    })),
  }
}

function projectToJson(row) {
  return {
    id: row.id,
    name: row.name,
    remark: row.remark,
    createdAt: row.created_at,
    recordCount: db.prepare('SELECT COUNT(*) AS c FROM project_records WHERE project_id = ?').get(row.id).c,
  }
}

// GET /api/projects 测试项目（测试名称）列表
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM test_projects ORDER BY sort ASC, id ASC').all()
  res.json({ code: 0, data: rows.map(projectToJson) })
})

// GET /api/projects/:id 项目详情（含各机型测试记录 + 实时引用的机型参数）
router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM test_projects WHERE id = ?').get(req.params.id)
  if (!project) return res.json({ code: 1, message: '项目不存在' })
  const records = db.prepare('SELECT * FROM project_records WHERE project_id = ? ORDER BY sort ASC, id ASC').all(project.id)
  res.json({
    code: 0,
    data: {
      ...projectToJson(project),
      records: records.map((r) => ({
        id: r.id,
        createdAt: r.created_at,
        device: deviceInfo(r.device_id),
        params: db
          .prepare('SELECT * FROM record_params WHERE record_id = ? ORDER BY sort ASC, id ASC')
          .all(r.id)
          .map((p) => ({ id: p.id, label: p.label, value: p.value })),
      })),
    },
  })
})

// ===== 以下接口需登录 =====
const auth = require('../auth')
router.use(auth)

// POST /api/projects 新增测试项目
router.post('/', (req, res) => {
  const b = req.body || {}
  if (!b.name || !String(b.name).trim()) return res.json({ code: 1, message: '测试名称必填' })
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const info = db
    .prepare(`INSERT INTO test_projects (name, remark, created_at, sort) VALUES (?, ?, ?, (SELECT IFNULL(MAX(sort), 0) + 1 FROM test_projects))`)
    .run(String(b.name).trim(), b.remark ?? '', now)
  res.json({ code: 0, data: { id: info.lastInsertRowid } })
})

// PUT /api/projects/:id 修改测试项目
router.put('/:id', (req, res) => {
  const b = req.body || {}
  if (!b.name || !String(b.name).trim()) return res.json({ code: 1, message: '测试名称必填' })
  db.prepare('UPDATE test_projects SET name = ?, remark = ? WHERE id = ?').run(String(b.name).trim(), b.remark ?? '', req.params.id)
  res.json({ code: 0, data: { ok: true } })
})

// DELETE /api/projects/:id 删除测试项目（级联删除记录与参数）
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM test_projects WHERE id = ?').run(req.params.id)
  res.json({ code: 0, data: { ok: true } })
})

// POST /api/projects/:id/records 添加机型测试数据
router.post('/:id/records', (req, res) => {
  const b = req.body || {}
  const deviceId = Number(b.deviceId) || 0
  const device = db.prepare('SELECT id FROM devices WHERE id = ?').get(deviceId)
  if (!device) return res.json({ code: 1, message: '请选择机型' })
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  db.exec('BEGIN')
  try {
    const info = db
      .prepare(`INSERT INTO project_records (project_id, device_id, created_at, sort) VALUES (?, ?, ?, (SELECT IFNULL(MAX(sort), 0) + 1 FROM project_records WHERE project_id = ?))`)
      .run(req.params.id, deviceId, now, req.params.id)
    const insertParam = db.prepare('INSERT INTO record_params (record_id, label, value, sort) VALUES (?, ?, ?, ?)')
    ;(b.params || []).forEach((p, i) => insertParam.run(info.lastInsertRowid, p.label ?? '', p.value ?? '', i))
    db.exec('COMMIT')
    res.json({ code: 0, data: { id: info.lastInsertRowid } })
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
})

// PUT /api/records/:id 修改机型测试数据
router.put('/records/:id', (req, res) => {
  const b = req.body || {}
  db.exec('BEGIN')
  try {
    if (b.deviceId) {
      db.prepare('UPDATE project_records SET device_id = ? WHERE id = ?').run(Number(b.deviceId), req.params.id)
    }
    db.prepare('DELETE FROM record_params WHERE record_id = ?').run(req.params.id)
    const insertParam = db.prepare('INSERT INTO record_params (record_id, label, value, sort) VALUES (?, ?, ?, ?)')
    ;(b.params || []).forEach((p, i) => insertParam.run(req.params.id, p.label ?? '', p.value ?? '', i))
    db.exec('COMMIT')
    res.json({ code: 0, data: { ok: true } })
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
})

// DELETE /api/records/:id 删除机型测试数据
router.delete('/records/:id', (req, res) => {
  db.prepare('DELETE FROM project_records WHERE id = ?').run(req.params.id)
  res.json({ code: 0, data: { ok: true } })
})

module.exports = router
