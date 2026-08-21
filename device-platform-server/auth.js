const db = require('./db')

// 鉴权中间件：校验 Authorization: Bearer <token>
function auth(req, res, next) {
  const header = req.headers.authorization || ''
  const token = header.startsWith('Bearer ') ? header.slice(7) : ''
  if (!token) return res.status(401).json({ code: 401, message: '未登录' })
  const row = db
    .prepare('SELECT t.user_id, u.username, t.expires_at FROM tokens t JOIN users u ON u.id = t.user_id WHERE t.token = ?')
    .get(token)
  if (!row) return res.status(401).json({ code: 401, message: '登录已失效' })
  if (new Date(row.expires_at.replace(' ', 'T')) < new Date()) {
    db.prepare('DELETE FROM tokens WHERE token = ?').run(token)
    return res.status(401).json({ code: 401, message: '登录已过期' })
  }
  req.user = { id: row.user_id, username: row.username }
  next()
}

module.exports = auth
