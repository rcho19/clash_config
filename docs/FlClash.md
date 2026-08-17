## 推荐的 FlClash 设置

### 导入脚本

在订阅的覆写设置中选择“脚本”，使用以下地址：

```text
https://testingcf.jsdelivr.net/gh/rcho19/clash_config@main/override/flclash-override.js
```

保存后重新应用订阅或重启内核。脚本会保留订阅原生 `PROXY`、显式 `GLOBAL` 和其他策略组；只有订阅没有 `PROXY` 时才补建一个。

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
10. Windows：以管理员权限运行，或正确安装并启用 FlClash 服务模式。

GeoData 下载地址同样由 FlClash 基础配置最终决定。若需要手动设置，建议使用：

```text
geoip: https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat
geosite: https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat
```

### 出口选择

- 已有 `PROXY` 时，脚本不会改写它，也不会重置用户选择；请在 FlClash 中确认 `PROXY` 当前选中 LAX 节点。
- 没有 `PROXY`、但订阅直接提供节点时，脚本会创建 `PROXY`，并优先排列 `la9929-vless-reality`、美国或 Reality/VLESS 节点。
- 只有 `proxy-providers` 时，新建的 `PROXY` 会通过 `use` 引用所有 provider。
- 若节点或 provider 已占用 `PROXY` 这个名称，脚本会使用 `FLCLASH-PROXY`，避免名称冲突。
- 对未显式设置指纹的 VMess/VLESS TLS、Trojan 和 AnyTLS 内联节点，脚本会补充节点级 `client-fingerprint: chrome`；订阅已有值保持不变。

### 验证清单

应用脚本后可在 FlClash 的最终配置或运行日志中核对：

1. 境外 DNS 地址带有 `#PROXY`（或自动生成的安全组名），没有 `system://`。
2. `direct-nameserver-follow-policy` 为 `false`。
3. TUN 中 `strict-route` 和 `auto-detect-interface` 为 `true`。
4. `GLOBAL` 没有被脚本重建，`PROXY` 仍保持预期节点选择。
5. 规则最后一条是 `MATCH,PROXY`（名称冲突时为自动生成的组名）。

脚本默认阻断常见 STUN/TURN UDP 端口，但不阻断 UDP 443/QUIC。若节点不支持 UDP、出现 HTTP/3 反复失败，可将脚本顶部 `STRICT_BLOCK_QUIC` 改为 `true` 后再测试。
