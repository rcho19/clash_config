## 推荐的 FlClash 设置

以下说明按 Windows FlClash v0.9.3 核对（2026-11-04），适用于当前 3x-ui VLESS + REALITY 内联节点订阅；含 `proxy-providers` 的订阅也可使用该脚本。

### 导入脚本

在订阅的覆写设置中选择“脚本”，使用以下地址：

```text
https://cdn.jsdelivr.net/gh/rcho19/clash_config@main/override/flclash-override.js
```

保存后重新应用订阅或重启内核。脚本会复用订阅原生 `PROXY`；缺少时才补建。`GLOBAL` 会固定跟随实际代理出口，旧版或订阅遗留的 `AI`、`MEDIA` 策略组会被删除，其域名仍统一走 `PROXY`。

该脚本适合需要兼容多节点或 `proxy-providers` 的动态场景，也可处理当前的单节点订阅；它不会硬编码美西节点名称。

### 客户端设置

FlClash 会在脚本执行后再次写入一部分基础配置。v0.9.3 的进阶配置支持按需“添加配置”：添加字段表示启用该字段的覆写，未添加的字段通常沿用订阅或脚本结果；TUN 的自动路由、接口检测和默认 DNS 劫持等仍由客户端写入。建议按以下方式设置：

1. 模式：`rule`。
2. IPv6：关闭。
3. 允许局域网：关闭；确实需要向局域网共享代理端口时再开启。
4. TUN：开启。
5. TUN 协议栈：当前已验证的 `mixed` 可继续使用；遇到兼容问题时再临时切换其他协议栈排查，无需仅因升级更换。
6. 网络 → 虚拟网卡 → DNS 劫持：无需专门添加，客户端默认写入 `dns-hijack: [any:53]`。若已添加，确认列表包含 `any:53` 即可保留；实际保存为空列表 `[]` 会覆盖默认值，不应把“添加后清空”当成启用劫持。
7. 网络 → 虚拟网卡 → 路由地址、排除路由地址：当前方案无需添加。客户端写入 `auto-route: true` 和 `auto-detect-interface: true`；排除路由地址未设置或为空列表时，没有额外指定绕过 TUN 的网段。确有绕过需求时再填写 CIDR；不要为了普通局域网访问直接添加整段私网地址，当前脚本已有私网直连规则。“绕过私有网络”保持关闭。
8. 进阶配置 → DNS：不添加覆写字段，让脚本管理 DNS。新版不再按旧说明寻找“覆写 DNS：关闭”总开关；全局和订阅级已选择的 DNS 字段会覆盖脚本对应结果，升级后应检查是否保留了旧选择。
9. 追加系统 DNS：关闭，否则最终 `nameserver` 会被加入 `system://`。
10. DNS 监听：应用脚本后应为 `127.0.0.1:1053`，不要使用 `0.0.0.0:1053`。
11. Windows：以管理员权限运行，或正确安装并启用 FlClash 服务模式。
12. 资源 → Geo 选项：开启自动更新，间隔设为 `24` 小时。这两个值由客户端在脚本执行后写入，不能依赖脚本开启。

脚本已设置 `strict-route: true`，无需额外添加“严格路由”覆写；若已添加，保持开启。添加列表字段后应检查实际条目，不能仅凭界面是否显示内容判断它是空列表还是采用了默认值。删除某个覆写项表示恢复该字段的默认或继承行为，与保留覆写项并清空列表不同。

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
4. TUN 中 `enable`、`auto-route`、`strict-route` 和 `auto-detect-interface` 为 `true`，`dns-hijack` 包含 `any:53`；当前方案的 `route-exclude-address` 应未设置或为空列表。
5. 单节点时，`PROXY` 显示唯一节点，`GLOBAL` 显示 `PROXY`；策略组列表中没有 `AI`、`MEDIA`。
6. 规则最后一条是 `MATCH,PROXY`（名称冲突时为自动生成的组名），并且原订阅的 `RULE-SET` 等非 `MATCH` 规则仍存在。
7. `geodata-mode` 为 `true`，`geo-auto-update` 为 `true`，`geo-update-interval` 为 `24`。后两项核对的是客户端最终配置，脚本输出本身不负责设置。
8. 当前 VLESS + REALITY 节点保留订阅的 `flow`、`servername` 和 `reality-opts`；缺少指纹时为 `client-fingerprint: chrome`。最终配置没有 `global-client-fingerprint`。

本地脚本回归验证命令：`node --test tests/flclash-override.test.js`。这些测试验证配置生成和参数保留，不代表 Windows 客户端实际连接或 DNS/WebRTC 泄漏测试已通过。

2026-11-04 本机升级核对：当前订阅绑定的脚本与仓库脚本一致，19 项回归测试全部通过；客户端保存的 DNS 劫持值为 `any:53`，排除路由地址为空，DNS 覆写字段集合为空，追加系统 DNS 关闭，生成配置符合上述关键项。分别向 `127.0.0.1:1053` 和 `223.5.5.5:53` 发送同一 Google 域名的 UDP DNS 查询，均返回相同的 Fake-IP，验证了当时所测 UDP 53 路径的 DNS 接管；这不代表浏览器 DoH、TCP DNS 或完整 DNS/WebRTC 泄漏测试已通过。

配置行为参考：[FlClash v0.9.3 配置生成逻辑](https://github.com/chen08209/FlClash/blob/v0.9.3/lib/common/task.dart)、[TUN 默认值及覆写模型](https://github.com/chen08209/FlClash/blob/v0.9.3/lib/models/clash_config.dart)、[Mihomo TUN 文档](https://wiki.metacubex.one/config/inbound/tun/)。

脚本默认阻断常见 STUN/TURN UDP 端口，但不阻断 UDP 443/QUIC。若节点不支持 UDP、出现 HTTP/3 反复失败，可将脚本顶部 `STRICT_BLOCK_QUIC` 改为 `true` 后再测试。
