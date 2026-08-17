## 推荐的 Clash Mi 设置

1. 覆写 → 内置-不覆写：保留，避免内置 DNS 覆盖 YAML。
2. 核心设置 → IPv6：禁用。
3. 核心设置 →

- TUN：
- 覆写：开启
- 启用：开启
- 网络栈：优先 mixed
- DNS 劫持：开启
- 严格路由：开启
- ICMP 转发：关闭

4. 附加 HTTP 代理到 VPN：关闭。
5. Windows 上以管理员身份运行 Clash Mi。
