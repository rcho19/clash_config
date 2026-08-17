## 推荐的 Clash Mi 设置

### windows配置

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
4. Windows 上以管理员身份运行 Clash Mi。

> Mihomo 官方目前建议无特殊问题时使用 mixed；它由 system 处理 TCP、gVisor 处理 UDP。
>
> 若 Windows 防火墙没有放行 Mihomo 内核，mixed/system 可能无法工作，此时应放行内核，或者临时切回 gvisor 验证

> 选择应用管理 TUN 的原因是 Clash Mi 会注入平台相关参数、应用排除项和运行时字段；其代码也针对不同平台限制可用协议栈。
>
> 官方说明的合并顺序是“订阅 → 自定义覆写 `YAML` → Clash Mi 内置覆写。所以客户端内置 TUN 会最后覆盖 YAML。
>
> 官方 FAQ 也明确说：如果 TUN 来自配置文件，应禁用客户端的 TUN 覆写[Clash Mi FAQ](https://clashmi.app/guide/faq)

### iOS配置

1. **订阅**

编辑配置 → 核心覆写：选择 YAML

2.  **核心设置**
    1. TUN：
       - 覆写：开启
       - 启用：开启
       - 网络栈：gvisor
       - DNS 劫持：开启
       - 严格路由：开启
       - ICMP 转发：关闭
       - `includeAllNetworks`：开启
       - `excludeLocalNetworks`：关闭
       - `excludeCellularServices`：关闭
       - `excludeAPNs`：关闭
       - 附加 HTTP 代理到 VPN：关闭

    2. IPV6: 禁用
    3. 覆写：`内置-不覆写`

> iOS/macOS 版 Clash Mi 只提供 gVisor 栈，不能选择 Mixed/System
>
> 上述网络包含/排除设置是偏向“完整接管”的组合，也是 Clash Mi 官方针对 iOS 推送异常给出的设置
>
> 但 Apple 系统仍会强制排除 DHCP、门户认证、部分运营商内部流量和部分配套设备通信，因此 iOS 无法做到字面意义上的 100% 全流量进入第三方 VPN
