## 推荐的 FlClash 设置

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
7. 路由模式：`使用配置`，避免客户端额外生成“绕过私网”的路由范围。
8. 覆写 DNS：关闭，否则客户端会在脚本执行后替换整段 DNS。
9. 追加系统 DNS：关闭，否则最终 `nameserver` 会被加入 `system://`。
10. DNS 监听：应用脚本后应为 `127.0.0.1:1053`，不要使用 `0.0.0.0:1053`。
11. Windows：以管理员权限运行，或正确安装并启用 FlClash 服务模式。

DNS 策略同样是重点域名防泄漏：AI、Google、Microsoft 等境外域名经 `PROXY` 解析；CN、私网、连通性和 NTP 使用直连 DoH 以保证可用性。若要求所有公共域名的 DNS 都从 VPS 出口发出，需要另行采用全量代理 DNS 策略，并接受国内 CDN/局域网解析兼容性下降。

GeoData 下载地址同样由 FlClash 基础配置最终决定。若需要手动设置，建议使用：

```text
geoip: https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat
geosite: https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat
```

### 出口选择

- 脚本不写死节点名称，也不根据地区、协议或名称关键词猜测优先节点；多节点始终保留订阅原始顺序。
- 单节点保持 `select`，不额外启用 `generate_204` 健康检查，避免探测地址不可达时把唯一的美西节点错误判定为不可用。
- 多节点始终保留订阅原始顺序；只有 `proxy-providers` 时，新建的 `PROXY` 会通过 `use` 引用所有 provider。
- `GLOBAL` 固定使用 `PROXY`（名称冲突时使用自动生成的安全组名）；全局模式与规则模式共用同一实际出口。
- `AI`、`MEDIA` 不再作为策略组保留；AI、Google、YouTube、Netflix、Spotify 等域名覆盖仍直接指向统一代理出口。
- 若节点或 provider 已占用 `PROXY` 这个名称，脚本会使用 `FLCLASH-PROXY`，避免名称冲突。
- 对未显式设置指纹的 VMess/VLESS TLS、Trojan 和 AnyTLS 内联节点，脚本会补充节点级 `client-fingerprint: chrome`；订阅已有值保持不变。Provider 尚未展开时保留全局兼容兜底。
- 订阅原有的安全非 `MATCH` 规则会被保留，包括 `RULE-SET`、`REJECT`、`PROCESS-NAME` 等；脚本自己的 AI、连通性和 STUN 安全规则优先。可能绕过 TUN 的 `NETWORK,UDP,DIRECT`、STUN/TURN 直连规则不会继承，最终 `MATCH` 统一指向实际代理出口。

### 验证清单

应用脚本后可在 FlClash 的最终配置或运行日志中核对：

1. 境外 DNS 地址带有 `#PROXY`（或自动生成的安全组名），没有 `system://`。
2. `direct-nameserver-follow-policy` 为 `false`。
3. `dns.listen` 为 `127.0.0.1:1053`，不是 `0.0.0.0:1053`。
4. TUN 中 `strict-route` 和 `auto-detect-interface` 为 `true`。
5. 单节点时，`PROXY` 显示唯一节点，`GLOBAL` 显示 `PROXY`；策略组列表中没有 `AI`、`MEDIA`。
6. 规则最后一条是 `MATCH,PROXY`（名称冲突时为自动生成的组名），并且原订阅的 `RULE-SET` 等非 `MATCH` 规则仍存在。

脚本默认阻断常见 STUN/TURN UDP 端口，但不阻断 UDP 443/QUIC。若节点不支持 UDP、出现 HTTP/3 反复失败，可将脚本顶部 `STRICT_BLOCK_QUIC` 改为 `true` 后再测试。
