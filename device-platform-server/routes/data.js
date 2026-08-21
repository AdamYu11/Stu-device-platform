const express = require('express')
const multer = require('multer')
const fs = require('fs')
const path = require('path')
const router = express.Router()
const db = require('../db')

const uploadDir = path.join(__dirname, '..', 'uploads')

function readImageBase64(image) {
  if (!image) return null
  try {
    const file = path.join(uploadDir, path.basename(image))
    if (!fs.existsSync(file)) return null
    const buf = fs.readFileSync(file)
    return { base64: buf.toString('base64'), ext: path.extname(image) }
  } catch (e) {
    return null
  }
}

// GET /api/export 导出全量数据（设备+参数+缩略图、测试项目+机型记录+测试结果）
router.get('/export', (req, res) => {
  const devices = db.prepare('SELECT * FROM devices ORDER BY sort ASC, id ASC').all()
  const deviceIndexMap = new Map(devices.map((d, i) => [d.id, i]))

  const data = {
    version: 3,
    exportedAt: new Date().toISOString(),
    brands: db.prepare('SELECT name, image FROM brands ORDER BY name ASC').all().map((b) => {
      const img = readImageBase64(b.image)
      return {
        name: b.name,
        image: b.image || '',
        imageBase64: img ? img.base64 : null,
        imageExt: img ? img.ext : '',
      }
    }),
    devices: devices.map((d) => {
      const img = readImageBase64(d.image)
      return {
        brand: d.brand,
        model: d.model,
        image: d.image || '',
        imageBase64: img ? img.base64 : null,
        imageExt: img ? img.ext : '',
        updatedAt: d.updated_at,
        groups: db
          .prepare('SELECT * FROM device_groups WHERE device_id = ? ORDER BY sort ASC, id ASC')
          .all(d.id)
          .map((g) => ({
            title: g.title,
            items: db
              .prepare('SELECT label, value FROM device_items WHERE group_id = ? ORDER BY sort ASC, id ASC')
              .all(g.id),
          })),
      }
    }),
    projects: db
      .prepare('SELECT * FROM test_projects ORDER BY sort ASC, id ASC')
      .all()
      .map((p) => ({
        name: p.name,
        remark: p.remark,
        createdAt: p.created_at,
        records: db
          .prepare('SELECT * FROM project_records WHERE project_id = ? ORDER BY sort ASC, id ASC')
          .all(p.id)
          .map((r) => ({
            deviceIndex: deviceIndexMap.get(r.device_id) ?? null,
            createdAt: r.created_at,
            params: db
              .prepare('SELECT label, value FROM record_params WHERE record_id = ? ORDER BY sort ASC, id ASC')
              .all(r.id),
          })),
      })),
  }
  res.json({ code: 0, data })
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
})

// POST /api/import 导入数据文件（覆盖当前全部数据）
router.post('/import', upload.single('file'), (req, res) => {
  if (!req.file) return res.json({ code: 1, message: '未收到文件' })
  let data
  try {
    data = JSON.parse(req.file.buffer.toString('utf8'))
  } catch (e) {
    return res.json({ code: 1, message: 'JSON 解析失败，请选择正确的导出文件' })
  }
  if (!data || !Array.isArray(data.devices) || !Array.isArray(data.projects)) {
    return res.json({ code: 1, message: '数据结构不正确，请选择正确的导出文件' })
  }

  db.exec('BEGIN')
  try {
    db.prepare('DELETE FROM record_params').run()
    db.prepare('DELETE FROM project_records').run()
    db.prepare('DELETE FROM test_projects').run()
    db.prepare('DELETE FROM device_items').run()
    db.prepare('DELETE FROM device_groups').run()
    db.prepare('DELETE FROM devices').run()
    db.prepare('DELETE FROM brands').run()

    const insBrand = db.prepare('INSERT INTO brands (name, image) VALUES (?, ?)')
    ;(data.brands || []).forEach((b) => {
      let image = b.image || ''
      if (b.imageBase64) {
        try {
          fs.mkdirSync(uploadDir, { recursive: true })
          const ext = (b.imageExt || path.extname(image) || '.jpg').toLowerCase()
          const name = Date.now() + '-b' + '-' + Math.round(Math.random() * 1e6) + ext
          fs.writeFileSync(path.join(uploadDir, name), Buffer.from(b.imageBase64, 'base64'))
          image = '/uploads/' + name
        } catch (e) {
          image = ''
        }
      }
      insBrand.run(b.name ?? '', image)
    })

    const insDevice = db.prepare('INSERT INTO devices (brand, model, image, updated_at, sort) VALUES (?, ?, ?, ?, ?)')
    const insGroup = db.prepare('INSERT INTO device_groups (device_id, title, sort) VALUES (?, ?, ?)')
    const insItem = db.prepare('INSERT INTO device_items (group_id, label, value, sort) VALUES (?, ?, ?, ?)')
    const insProject = db.prepare('INSERT INTO test_projects (name, remark, created_at, sort) VALUES (?, ?, ?, ?)')
    const insRecord = db.prepare('INSERT INTO project_records (project_id, device_id, created_at, sort) VALUES (?, ?, ?, ?)')
    const insParam = db.prepare('INSERT INTO record_params (record_id, label, value, sort) VALUES (?, ?, ?, ?)')

    const deviceIds = data.devices.map((d, di) => {
      // 恢复缩略图：内嵌 base64 则落盘，否则保留原路径（文件缺失时前端自动回退图标）
      let image = d.image || ''
      if (d.imageBase64) {
        try {
          fs.mkdirSync(uploadDir, { recursive: true })
          const ext = (d.imageExt || path.extname(image) || '.jpg').toLowerCase()
          const name = Date.now() + '-' + di + '-' + Math.round(Math.random() * 1e6) + ext
          fs.writeFileSync(path.join(uploadDir, name), Buffer.from(d.imageBase64, 'base64'))
          image = '/uploads/' + name
        } catch (e) {
          image = ''
        }
      }
      const { lastInsertRowid: deviceId } = insDevice.run(d.brand ?? '', d.model ?? '', image, d.updatedAt ?? '', di)
      ;(d.groups || []).forEach((g, gi) => {
        const { lastInsertRowid: groupId } = insGroup.run(deviceId, g.title ?? '', gi)
        ;(g.items || []).forEach((it, ii) => insItem.run(groupId, it.label ?? '', it.value ?? '', ii))
      })
      return deviceId
    })

    data.projects.forEach((p, pi) => {
      const { lastInsertRowid: projectId } = insProject.run(p.name ?? '', p.remark ?? '', p.createdAt ?? '', pi)
      ;(p.records || []).forEach((r, ri) => {
        const deviceId = deviceIds[r.deviceIndex]
        if (deviceId === undefined) return
        const { lastInsertRowid: recordId } = insRecord.run(projectId, deviceId, r.createdAt ?? '', ri)
        ;(r.params || []).forEach((pp, ii) => insParam.run(recordId, pp.label ?? '', pp.value ?? '', ii))
      })
    })

    db.exec('COMMIT')
    res.json({ code: 0, data: { ok: true, devices: data.devices.length, projects: data.projects.length } })
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
})

module.exports = router
