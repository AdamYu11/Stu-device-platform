const express = require('express')
const cors = require('cors')
const path = require('path')
const auth = require('./auth')
const projectsRouter = require('./routes/projects')
const devicesRouter = require('./routes/devices')
const uploadRouter = require('./routes/upload')
const dataRouter = require('./routes/data')
const authRouter = require('./routes/auth')
const brandsRouter = require('./routes/brands')
const aiRouter = require('./routes/ai')

const app = express()
app.use(cors())
app.use(express.json())

app.get('/', (req, res) => res.json({ code: 0, data: 'device-server ok' }))

// 上传的缩略图静态托管（公开访问）
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

app.use('/api/auth', authRouter)
app.use('/api/projects', projectsRouter)
app.use('/api/devices', devicesRouter)
app.use('/api/brands', brandsRouter)
app.use('/api/ai', aiRouter) // AI 助手（无鉴权，路由内部自行限流；需登录可设 AI_REQUIRE_AUTH=1）
// 以下接口需登录
app.use('/api/upload', auth, uploadRouter)
app.use('/api', auth, dataRouter)

app.use((err, req, res, next) => {
  console.error(err)
  res.status(500).json({ code: 1, message: '服务器内部错误' })
})

const PORT = process.env.PORT || 3000
app.listen(PORT, () => console.log(`device-server running at http://localhost:${PORT}`))
