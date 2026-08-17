## 推荐的 Clash Mi 设置

**核心设置**

1. IPv6：禁用。
2. TUN：
   - 覆写：开启
   - 启用：开启
   - 网络栈：优先 mixed
   - DNS 劫持：开启
   - 严格路由：开启
   - ICMP 转发：关闭
3. 覆写：内置-不覆写（避免内置 DNS 覆盖 YAML）。
4. 附加 HTTP 代理到 VPN：关闭。
5. Windows 上以管理员身份运行 Clash Mi。

> Mihomo 官方目前建议无特殊问题时使用 mixed；它由 system 处理 TCP、gVisor 处理 UDP。
>
> 若 Windows 防火墙没有放行 Mihomo 内核，mixed/system 可能无法工作，此时应放行内核，或者临时切回 gvisor 验证

> 选择应用管理 TUN 的原因是 Clash Mi 会注入平台相关参数、应用排除项和运行时字段；其代码也针对不同平台限制可用协议栈。
>
> 官方说明的合并顺序是“订阅 → 自定义覆写 `YAML` → Clash Mi 内置覆写。所以客户端内置 TUN 会最后覆盖 YAML。
>
> 官方 FAQ 也明确说：如果 TUN 来自配置文件，应禁用客户端的 TUN 覆写[Clash Mi FAQ](https://clashmi.app/guide/faq)
