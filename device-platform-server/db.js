const { DatabaseSync } = require('node:sqlite')
const path = require('path')

// 使用 Node.js 内置 SQLite（Node >= 22.13 无需额外原生依赖）
const db = new DatabaseSync(path.join(__dirname, 'data.db'))
db.exec('PRAGMA journal_mode = WAL')
db.exec('PRAGMA foreign_keys = ON')

db.exec(`
CREATE TABLE IF NOT EXISTS devices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  brand TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS device_groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS device_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL REFERENCES device_groups(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  value TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS test_projects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL DEFAULT '',
  remark TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS project_records (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  project_id INTEGER NOT NULL REFERENCES test_projects(id) ON DELETE CASCADE,
  device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS record_params (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  record_id INTEGER NOT NULL REFERENCES project_records(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT '',
  value TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS brands (
  name TEXT PRIMARY KEY,
  image TEXT NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS tokens (
  token TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL DEFAULT ''
);
`)

// 旧库迁移：devices 表补充 image 字段
const deviceCols = db.prepare('PRAGMA table_info(devices)').all().map((c) => c.name)
if (!deviceCols.includes('image')) {
  db.exec("ALTER TABLE devices ADD COLUMN image TEXT NOT NULL DEFAULT ''")
}

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) AS c FROM devices').get().c
  if (count > 0) return
  const now = new Date().toISOString().slice(0, 19).replace('T', ' ')
  const insertDevice = db.prepare(`INSERT INTO devices (brand, model, updated_at, sort) VALUES (?, ?, ?, ?)`)
  const insertGroup = db.prepare(`INSERT INTO device_groups (device_id, title, sort) VALUES (?, ?, ?)`)
  const insertDeviceItem = db.prepare(`INSERT INTO device_items (group_id, label, value, sort) VALUES (?, ?, ?, ?)`)
  const insertProject = db.prepare(`INSERT INTO test_projects (name, remark, created_at, sort) VALUES (?, ?, ?, ?)`)
  const insertRecord = db.prepare(`INSERT INTO project_records (project_id, device_id, created_at, sort) VALUES (?, ?, ?, ?)`)
  const insertParam = db.prepare(`INSERT INTO record_params (record_id, label, value, sort) VALUES (?, ?, ?, ?)`)

  const DEVICES = [
    {
      brand: '小米', model: '15 Ultra',
      groups: [
        { title: '基本信息', items: [['品牌', '小米'], ['型号', '15 Ultra'], ['处理器', '骁龙8至尊版']] },
        { title: '屏幕', items: [['屏幕', '6.73英寸 2K 120Hz'], ['亮度', '峰值 3200nit']] },
        { title: '电池', items: [['电池容量', '6000mAh'], ['充电', '90W 有线']] },
        { title: '其他', items: [['重量', '226g']] },
      ],
    },
    {
      brand: '苹果', model: 'iPhone 16 Pro Max',
      groups: [
        { title: '基本信息', items: [['品牌', 'Apple'], ['型号', 'iPhone 16 Pro Max'], ['处理器', 'A18 Pro']] },
        { title: '屏幕', items: [['屏幕', '6.9英寸 120Hz'], ['亮度', '峰值 2000nit']] },
        { title: '电池', items: [['电池容量', '4685mAh'], ['充电', '45W 有线 · MagSafe']] },
        { title: '系统', items: [['操作系统', 'iOS 18']] },
      ],
    },
    {
      brand: '华为', model: 'Mate 70 Pro',
      groups: [
        { title: '基本信息', items: [['品牌', '华为'], ['型号', 'Mate 70 Pro'], ['处理器', '麒麟9020']] },
        { title: '屏幕', items: [['屏幕', '6.9英寸 1.5K 120Hz'], ['亮度', '峰值 2500nit']] },
        { title: '电池', items: [['电池容量', '5500mAh'], ['充电', '100W 有线']] },
        { title: '系统', items: [['操作系统', 'HarmonyOS 5']] },
      ],
    },
  ]

  const PROJECTS = [
    {
      name: '续航测试', remark: '5小时重度使用模拟',
      records: [
        { device: 0, params: [['剩余电量', '78%'], ['机身温度', '41.2℃'], ['续航时长', '8小时42分'], ['结论', '通过']] },
        { device: 1, params: [['剩余电量', '72%'], ['机身温度', '42.5℃'], ['续航时长', '7小时58分'], ['结论', '通过']] },
      ],
    },
    {
      name: '充电测试', remark: '0-100 充电记录',
      records: [
        { device: 0, params: [['峰值功率', '90W'], ['30分钟充电', '95%'], ['充满用时', '32分钟'], ['结论', '通过']] },
        { device: 1, params: [['峰值功率', '45W'], ['30分钟充电', '82%'], ['充满用时', '58分钟'], ['结论', '通过']] },
      ],
    },
    {
      name: '信号测试', remark: '弱场环境测试',
      records: [
        { device: 2, params: [['5G 下载', '986Mbps'], ['通话掉线率', '0.3%'], ['GPS 精度', '1.6m'], ['结论', '通过']] },
      ],
    },
  ]

  const seed = () => {
    db.exec('BEGIN')
    try {
      const deviceIds = DEVICES.map((d, di) => {
        const { lastInsertRowid: deviceId } = insertDevice.run(d.brand, d.model, now, di)
        d.groups.forEach((g, gi) => {
          const { lastInsertRowid: groupId } = insertGroup.run(deviceId, g.title, gi)
          g.items.forEach(([label, value], ii) => insertDeviceItem.run(groupId, label, value, ii))
        })
        return deviceId
      })

      PROJECTS.forEach((p, pi) => {
        const { lastInsertRowid: projectId } = insertProject.run(p.name, p.remark, now, pi)
        p.records.forEach((r, ri) => {
          const { lastInsertRowid: recordId } = insertRecord.run(projectId, deviceIds[r.device], now, ri)
          r.params.forEach(([label, value], ii) => insertParam.run(recordId, label, value, ii))
        })
      })
      db.exec('COMMIT')
    } catch (e) {
      db.exec('ROLLBACK')
      throw e
    }
  }

  seed()
}

seedIfEmpty()

// 默认管理员账号（仅首次创建，密码 admin123，登录后请尽快修改）
const crypto = require('crypto')

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return salt + ':' + hash
}

function verifyPassword(password, stored) {
  try {
    const [salt, hash] = stored.split(':')
    const test = crypto.scryptSync(password, salt, 64).toString('hex')
    return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(test, 'hex'))
  } catch (e) {
    return false
  }
}

// 默认管理员账号：
// - 首次启动自动创建，可通过环境变量自定义：ADMIN_USERNAME / ADMIN_PASSWORD
// - 登录后建议在管理后台「修改密码」；数据库已有用户时环境变量不生效
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c
if (userCount === 0) {
  const username = process.env.ADMIN_USERNAME || 'admin'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  db.prepare('INSERT INTO users (username, password, created_at) VALUES (?, ?, ?)').run(
    username,
    hashPassword(password),
    new Date().toISOString().slice(0, 19).replace('T', ' ')
  )
  console.log(`默认管理员已创建：${username}（请登录后尽快修改密码）`)
}

module.exports = db
module.exports.hashPassword = hashPassword
module.exports.verifyPassword = verifyPassword
