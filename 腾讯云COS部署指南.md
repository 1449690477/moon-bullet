# 月蚀弹幕 · 腾讯云COS 网页版部署指南

## 一句话概览

把 `index.html` + `assets/` 传到腾讯云COS存储桶，开启静态网站托管，拿到一个 `https://xxx.cos-website.ap-xxx.myqcloud.com` 的链接，**点击即玩，免费额度内不花钱，无需备案**。

---

## 你需要准备什么

| 项目 | 必须？ | 说明 |
|------|--------|------|
| 腾讯云账号 | ✅ 必须 | https://cloud.tencent.com 注册，实名认证即可 |
| API 密钥 | ✅ 必须 | SecretId + SecretKey，用于部署脚本 |
| 已备案域名 | ❌ 不需要 | COS默认域名可直接访问，绑定自定义域名才需备案 |
| Python 3 | ✅ 必须 | 运行部署脚本用，Mac自带 |

---

## 步骤一：创建 COS 存储桶

1. 登录腾讯云控制台 → 搜索「COS」或访问 https://console.cloud.tencent.com/cos
2. 点击「存储桶列表」→「创建存储桶」
3. 填写：
   - **名称**：随便起，如 `moon-bullet`（系统会自动加APPID后缀变成 `moon-bullet-1234567890`）
   - **地域**：选离你近的，如「广州」(ap-guangzhou)、「上海」(ap-shanghai)、「北京」(ap-beijing)
   - **访问权限**：选 **「公有读私有写」**（重要！否则网页打不开）
4. 其他默认，点「创建」

> ⚠️ 记住完整的桶名（含后缀）和地域代码，部署脚本要用。

---

## 步骤二：获取 API 密钥

1. 访问 https://console.cloud.tencent.com/cam/capi
2. 如果没有密钥，点「新建密钥」
3. 复制 **SecretId** 和 **SecretKey**

> ⚠️ SecretKey 等同于账号密码，不要泄露给任何人，不要提交到 Git。

---

## 步骤三：运行部署脚本

打开终端，进入项目目录：

```bash
cd /Users/wanghan/Downloads/moon_bullet_demo_v3/moon_bullet_demo_v3_6
```

### 方式A：交互式（推荐）

```bash
python3 deploy_to_cos.py
```

按提示依次输入：
- SecretId
- SecretKey
- 存储桶名称（如 `moon-bullet-1234567890`）
- 地域代码（如 `ap-guangzhou`）

### 方式B：环境变量

```bash
COS_SECRET_ID=你的SecretId \
COS_SECRET_KEY=你的SecretKey \
COS_BUCKET=moon-bullet-1234567890 \
COS_REGION=ap-guangzhou \
python3 deploy_to_cos.py
```

脚本会自动：
1. 上传 `index.html`（665KB）
2. 递归上传 `assets/`（约117MB，已自动排除 39MB 备份目录）
3. 设置存储桶为公有读
4. 开启静态网站托管
5. 输出可访问链接

预计耗时：2-5 分钟（取决于你的上传带宽）。

---

## 步骤四：访问游戏

部署完成后，脚本会输出两个链接：

```
静态网站链接（推荐）：https://moon-bullet-1234567890.cos-website.ap-guangzhou.myqcloud.com/index.html
直接COS链接（备用）：https://moon-bullet-1234567890.cos.ap-guangzhou.myqcloud.com/index.html
```

用浏览器打开第一个链接，即可直接玩。

**把链接发给朋友，对方点开就能玩，无需下载安装。**

---

## （可选）步骤五：绑定自定义域名 + CDN 加速

如果你有自己的域名且已备案，可以进一步配置：

1. COS 控制台 → 进入存储桶 → 「域名与传输管理」→「自定义源站域名」→ 添加
2. 按提示到域名服务商添加 CNAME 解析
3. （可选）开通 CDN：https://console.cloud.tencent.com/cdn
   - 添加加速域名，源站类型选「COS源」
   - 加速后国内访问速度大幅提升

绑定后就能用 `https://game.yourdomain.com` 这样的链接访问。

---

## 费用估算

腾讯云COS 免费额度（个人用户）：

| 项目 | 免费额度 | 你这款游戏的用量 |
|------|----------|------------------|
| 存储空间 | 50 GB/月 | ~0.12 GB（远低于额度） |
| 请求次数 | 100万次/月 | 每次访问约700次请求 |
| 下行流量 | 10 GB/月 | 每次完整加载约117MB |

**换算：免费额度内约可支持 85 次完整加载/月。**

超出后按量计费（广州地域参考）：
- 存储：0.1 元/GB/月
- 流量：0.5 元/GB（外网下行）
- 请求：0.01 元/万次

**典型场景**：月活100玩家、每人玩3次，流量约35GB，超出25GB，月费约 12.5 元。

> 如果想省流量费，建议后续做资源优化（PNG→WebP、wav→ogg），能把流量降到 1/4。

---

## 常见问题

**Q: 打不开链接，显示 403？**
A: 存储桶访问权限没设对。控制台 → 存储桶 → 权限管理 → 设为「公有读私有写」。

**Q: 页面打开了但是白屏？**
A: 检查 index.html 是否上传成功，浏览器 F12 看 Console 报错。通常是某些资源路径问题。

**Q: 想更新版本怎么办？**
A: 重新运行 `python3 deploy_to_cos.py` 即可，会覆盖旧文件。

**Q: 想删掉重来？**
A: COS 控制台 → 存储桶 → 清空 → 删除存储桶。

**Q: 不想用腾讯云了怎么办？**
A: 随时可以删除存储桶，改用 Cloudflare Pages / itch.io / GitHub Pages，代码不用改任何一行（纯前端）。

---

## 一键部署命令速查

```bash
cd /Users/wanghan/Downloads/moon_bullet_demo_v3/moon_bullet_demo_v3_6
pip install cos-python-sdk-v5  # 如未安装
python3 deploy_to_cos.py
# 按提示输入凭证和桶名，5分钟拿到链接
```
