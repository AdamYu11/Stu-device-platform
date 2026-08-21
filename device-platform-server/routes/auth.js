const express = require('express')
const crypto = require('crypto')
const db = require('../db')
const { verifyPassword, hashPassword } = require('../db')
const auth = require('../auth')

const router = express.Router()

const TOKEN_DAYS = 7

// POST /api/auth/login 登录
router.post('/login', (req, res) => {
  const b = req.body || {}
  const username = String(b.username || '').trim()
  const password = String(b.password || '')
  if (!username || !password) return res.json({ code: 1, message: '请输入用户名和密码' })
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username)
  if (!user || !verifyPassword(password, user.password)) {
    return res.json({ code: 1, message: '用户名或密码错误' })
  }
  const token = crypto.randomBytes(32).toString('hex')
  const now = new Date()
  const expires = new Date(now.getTime() + TOKEN_DAYS * 24 * 60 * 60 * 1000)
  const fmt = (d) => d.toISOString().slice(0, 19).replace('T', ' ')
  db.prepare('INSERT INTO tokens (token, user_id, created_at, expires_at) VALUES (?, ?, ?, ?)').run(
    token,
    user.id,
    fmt(now),
    fmt(expires)
  )
  res.json({ code: 0, data: { token, username: user.username, expiresAt: fmt(expires) } })
})

// POST /api/auth/logout 退出登录
router.post('/logout', auth, (req, res) => {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (token) db.prepare('DELETE FROM tokens WHERE token = ?').run(token)
  res.json({ code: 0, data: { ok: true } })
})

// GET /api/auth/me 当前用户
router.get('/me', auth, (req, res) => {
  res.json({ code: 0, data: { username: req.user.username } })
})

// POST /api/auth/password 修改密码
router.post('/password', auth, (req, res) => {
  const b = req.body || {}
  const oldPassword = String(b.oldPassword || '')
  const newPassword = String(b.newPassword || '')
  if (!oldPassword || !newPassword) return res.json({ code: 1, message: '请填写完整' })
  if (newPassword.length < 6) return res.json({ code: 1, message: '新密码至少 6 位' })
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (!user || !verifyPassword(oldPassword, user.password)) {
    return res.json({ code: 1, message: '原密码错误' })
  }
  db.prepare('UPDATE users SET password = ? WHERE id = ?').run(hashPassword(newPassword), user.id)
  // 修改密码后其它会话全部失效
  db.prepare('DELETE FROM tokens WHERE user_id = ? AND token != ?').run(user.id, (req.headers.authorization || '').slice(7))
  res.json({ code: 0, data: { ok: true } })
})

module.exports = router
