const express = require('express')
const multer = require('multer')
const path = require('path')
const fs = require('fs')

const router = express.Router()

const uploadDir = path.join(__dirname, '..', 'uploads')
fs.mkdirSync(uploadDir, { recursive: true })

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const ext = (path.extname(file.originalname) || '.jpg').toLowerCase()
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e6) + ext)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (/^image\//.test(file.mimetype)) cb(null, true)
    else cb(new Error('仅支持图片文件'))
  },
})

// POST /api/upload 上传缩略图，返回可访问的相对路径
router.post('/', upload.single('file'), (req, res) => {
  if (!req.file) return res.json({ code: 1, message: '未收到文件' })
  res.json({ code: 0, data: { url: '/uploads/' + req.file.filename } })
})

module.exports = router
