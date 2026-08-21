# device-server 部署指南

## 1. 环境要求

- Node.js 22.13+（使用内置 SQLite，无需安装数据库）
- 推荐 Linux 服务器（云服务器 VPS），Windows 本机也可运行

## 2. 部署步骤（Linux VPS）

```bash
# 1) 上传代码（scp / git 均可，node_modules 不用传）
scp -r device-server root@你的服务器:/opt/

# 2) 安装依赖
cd /opt/device-server
npm install

# 3) 创建管理员账号（环境变量，仅在首次启动时生效）
#    ADMIN_USERNAME  用户名，默认 admin
#    ADMIN_PASSWORD  密码，默认 admin123
ADMIN_USERNAME=你的用户名 ADMIN_PASSWORD=你的密码 node index.js
# 看到日志「默认管理员已创建：你的用户名」即成功，Ctrl+C 停掉

# 4) 用 pm2 常驻运行
npm install -g pm2
ADMIN_USERNAME=你的用户名 ADMIN_PASSWORD=你的密码 pm2 start index.js --name device-server
pm2 save          # 保存进程列表
pm2 startup       # 按提示执行输出命令，实现开机自启

# 5) 验证
curl http://localhost:3000/api/projects   # 返回 {"code":0,...}
```

## 3. Windows 本机运行

```powershell
cd device-server
npm install
$env:ADMIN_USERNAME="你的用户名"
$env:ADMIN_PASSWORD="你的密码"
node index.js
```

## 4. 绑定域名 + HTTPS（小程序发布必需）

小程序要求「备案的 HTTPS 域名」，用 nginx 反代：

```nginx
server {
    listen 443 ssl;
    server_name api.你的域名.com;

    ssl_certificate     /etc/letsencrypt/live/api.你的域名.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.你的域名.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        client_max_body_size 50m;   # 导入数据文件较大，放宽限制
    }
}
```

HTTPS 证书用 certbot 免费签发：`certbot --nginx -d api.你的域名.com`

## 5. 前端接入

改 `device-platform/src/api/config.js`：

```js
export const BASE_URL = 'https://api.你的域名.com'
```

然后重新构建部署前端（H5 和/或小程序）。

## 6. 账号管理

| 操作 | 方法 |
|---|---|
| 初始账号 | 首次启动环境变量 `ADMIN_USERNAME` / `ADMIN_PASSWORD` |
| 修改密码 | 登录管理后台 → 右上角「修改密码」（改后其它登录全部失效） |
| 重置管理员 | 停止服务 → 删 `data.db`、`data.db-wal`、`data.db-shm` → 用环境变量重启（数据会清空，先导出备份） |

## 7. 数据备份与迁移

- **JSON 导出/导入**：管理后台「导出数据」得到单文件（含全部数据+图片），新环境「导入数据」恢复，推荐定期导出留档
- **整库拷贝**：停止服务后直接复制 `data.db` 文件
- **图片文件**：`uploads/` 目录（JSON 导入会自动恢复图片，无需单独拷贝）

## 8. 常用运维

```bash
pm2 status                    # 查看运行状态
pm2 logs device-server        # 查看日志
pm2 restart device-server     # 重启
```

防火墙需放行 3000 端口（走 nginx 反代时只放行 443 即可，3000 可不对外开放）。
