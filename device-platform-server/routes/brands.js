const express = require('express')
const router = express.Router()
const db = require('../db')

// GET /api/brands 品牌 Logo 列表（公开）
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT name, image FROM brands ORDER BY name ASC').all()
  res.json({ code: 0, data: rows })
})

// ===== 以下接口需登录 =====
const auth = require('../auth')
router.use(auth)

// PUT /api/brands/image 保存品牌 Logo（image 为空则移除）
router.put('/image', (req, res) => {
  const b = req.body || {}
  const name = String(b.name || '').trim()
  const image = b.image || ''
  if (!name) return res.json({ code: 1, message: '品牌名必填' })
  if (!image) {
    db.prepare('DELETE FROM brands WHERE name = ?').run(name)
  } else {
    db.prepare('INSERT INTO brands (name, image) VALUES (?, ?) ON CONFLICT(name) DO UPDATE SET image = excluded.image').run(name, image)
  }
  res.json({ code: 0, data: { ok: true } })
})

module.exports = router
