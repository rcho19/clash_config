## 推荐的 FlClash 设置

以下说明按 Windows FlClash v0.8.99 核对，适用于当前 3x-ui VLESS + REALITY 内联节点订阅；含 `proxy-providers` 的订阅也可使用该脚本。

### 导入脚本

在订阅的覆写设置中选择“脚本”，使用以下地址：

```text
https://cdn.jsdelivr.net/gh/rcho19/clash_config@main/override/flclash-override.js
```

保存后重新应用订阅或重启内核。脚本会复用订阅原生 `PROXY`；缺少时才补建。`GLOBAL` 会固定跟随实际代理出口，旧版或订阅遗留的 `AI`、`MEDIA` 策略组会被删除，其域名仍统一走 `PROXY`。

该脚本适合需要兼容多节点或 `proxy-providers` 的动态场景，也可处理当前的单节点订阅；它不会硬编码美西节点名称。

### 客户端设置

FlClash 会在脚本执行后再次写入一部分基础配置，因此下列项目必须在客户端中设置，不能依赖脚本：

1. 模式：`rule`。
2. IPv6：关闭。
3. 允许局域网：关闭；确实需要向局域网共享代理端口时再开启。
4. TUN：开启。
5. TUN 协议栈：优先 `mixed`；遇到兼容问题时再临时切换 `system` 或 `gvisor` 排查。
6. DNS 劫持：开启。
7. 路由模式：`使用配置`。v0.8.99 Windows 桌面端最终由客户端设置 `auto-route: true`、`route-address: []`；脚本保留 `strict-route` 和 `auto-detect-interface`。
8. 覆写 DNS：关闭，让脚本管理 DNS。v0.8.99 支持按字段覆写，开启后所选字段会覆盖脚本结果；升级迁移也可能保留旧版已选择的字段。
9. 追加系统 DNS：关闭，否则最终 `nameserver` 会被加入 `system://`。
10. DNS 监听：应用脚本后应为 `127.0.0.1:1053`，不要使用 `0.0.0.0:1053`。
11. Windows：以管理员权限运行，或正确安装并启用 FlClash 服务模式。
12. 资源 → Geo 选项：开启自动更新，间隔设为 `24` 小时。这两个值由客户端在脚本执行后写入，不能依赖脚本开启。

DNS 策略同样是重点域名防泄漏：AI、Google、Microsoft 等境外域名经 `PROXY` 解析；CN、私网、连通性和 NTP 使用直连 DoH 以保证可用性。若要求所有公共域名的 DNS 都从 VPS 出口发出，需要另行采用全量代理 DNS 策略，并接受国内 CDN/局域网解析兼容性下降。

### Geo 资源

脚本保留 `geodata-mode: true`，使用 `geoip.dat`；分流规则和 DNS 策略还依赖 `geosite.dat`。

GeoData 下载地址由 FlClash“资源”页面最终决定。默认 MetaCubeX 来源正常时可以保持默认；更新失败时可在对应资源的“编辑”菜单中使用以下地址，再执行“同步”：

```text
geoip: https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat
geosite: https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat
```

同步后等待更新状态结束，确认提示“已更新”或“已是最新版本”。Geo 更新不会替代节点订阅更新，也不会改写 VLESS/REALITY 连接参数。

### 出口选择

- 脚本不写死节点名称，也不根据地区、协议或名称关键词猜测优先节点；多节点始终保留订阅原始顺序。
- 单节点保持 `select`，不额外启用 `generate_204` 健康检查，避免探测地址不可达时把唯一的美西节点错误判定为不可用。
- 多节点始终保留订阅原始顺序；只有 `proxy-providers` 时，新建的 `PROXY` 会通过 `use` 引用所有 provider。
- `GLOBAL` 固定使用 `PROXY`（名称冲突时使用自动生成的安全组名）；全局模式与规则模式共用同一实际出口。
- `AI`、`MEDIA` 不再作为策略组保留；AI、Google、YouTube、Netflix、Spotify 等域名覆盖仍直接指向统一代理出口。
- 若节点或 provider 已占用 `PROXY` 这个名称，脚本会使用 `FLCLASH-PROXY`，避免名称冲突。
- 对未显式设置指纹的 VMess/VLESS TLS、Trojan 和 AnyTLS 内联节点，脚本会补充节点级 `client-fingerprint: chrome`；订阅已有值保持不变。VLESS 的 `flow`、`servername`、`reality-opts` 等连接参数保持订阅原值。
- v0.8.99 对应内核已移除 `global-client-fingerprint`，脚本会清理该字段。Provider 使用 `override.override-expr` 在节点展开时仅给缺少指纹的 TLS 节点补默认值；Provider 既有覆写保留并先执行。这项兼容逻辑要求内核支持 `override-expr`。
- 订阅原有的安全非 `MATCH` 规则会被保留，包括 `RULE-SET`、`REJECT`、`PROCESS-NAME` 等；脚本自己的 AI、连通性和 STUN 安全规则优先。可能绕过 TUN 的 `NETWORK,UDP,DIRECT`、STUN/TURN 直连规则不会继承，最终 `MATCH` 统一指向实际代理出口。

### 验证清单

应用脚本后可在 FlClash 的最终配置或运行日志中核对：

1. 境外 DNS 地址带有 `#PROXY`（或自动生成的安全组名），没有 `system://`。
2. `direct-nameserver-follow-policy` 为 `false`。
3. `dns.listen` 为 `127.0.0.1:1053`，不是 `0.0.0.0:1053`。
4. TUN 中 `strict-route` 和 `auto-detect-interface` 为 `true`。
5. 单节点时，`PROXY` 显示唯一节点，`GLOBAL` 显示 `PROXY`；策略组列表中没有 `AI`、`MEDIA`。
6. 规则最后一条是 `MATCH,PROXY`（名称冲突时为自动生成的组名），并且原订阅的 `RULE-SET` 等非 `MATCH` 规则仍存在。
7. `geodata-mode` 为 `true`，`geo-auto-update` 为 `true`，`geo-update-interval` 为 `24`。后两项核对的是客户端最终配置，脚本输出本身不负责设置。
8. 当前 VLESS + REALITY 节点保留订阅的 `flow`、`servername` 和 `reality-opts`；缺少指纹时为 `client-fingerprint: chrome`。最终配置没有 `global-client-fingerprint`。

本地脚本回归验证命令：`node --test tests/flclash-override.test.js`。这些测试验证配置生成和参数保留，不代表 Windows 客户端实际连接或 DNS/WebRTC 泄漏测试已通过。

脚本默认阻断常见 STUN/TURN UDP 端口，但不阻断 UDP 443/QUIC。若节点不支持 UDP、出现 HTTP/3 反复失败，可将脚本顶部 `STRICT_BLOCK_QUIC` 改为 `true` 后再测试。
