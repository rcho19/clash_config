## 推荐的 Clash Mi 设置

本目录的 `clashmi-override.yaml` 是针对当前 3x-ui“单节点输出”的覆写，不用于带有复杂原生策略组的多节点/Provider 订阅。多节点订阅应使用能够动态识别节点和 Provider 的脚本方案。

### 覆写层级与防止被内置设置覆盖

Clash Mi 的实际生成顺序是：订阅配置 → 自定义覆写 YAML → Clash Mi 内置覆写。后置内置覆写可以覆盖前面 YAML 的字段，因此 YAML 本身无法阻止客户端最后一层覆盖。

这里要区分两个设置：

1. `核心设置 → TUN → 覆写`：开启。当前 YAML 不声明 `tun`，由客户端负责注入平台所需的 TUN、DNS 劫持和严格路由参数。
2. `订阅/核心覆写 → 内置覆写`：选择 `内置-不覆写`。不要选择 `内置-覆写`，否则客户端默认 DNS 可能清空 `proxy-server-nameserver`，并覆盖 YAML 的 DNS 策略。

官方 FAQ 也明确了上述覆写顺序和 `内置-不覆写` 的使用方式：[Clash Mi FAQ](https://clashmi.app/guide/faq)。

重新连接后，应在“当前配置/最终配置”中确认：

- 存在 `PROXY` 和 `GLOBAL` 两个策略组，`PROXY` 收录唯一的美西节点，`GLOBAL` 只引用 `PROXY`；
- `dns.nameserver` 中的境外 DoH 带有 `#PROXY`；
- `dns.proxy-server-nameserver` 非空，且没有意外出现 `system://`；
- `dns.listen` 为 `127.0.0.1:1053`，不是 `0.0.0.0:1053`；
- 规则最后一条为 `MATCH,PROXY`。

Clash Mi 与 FlClash 不要同时启动；两者默认都使用本机 `1053` DNS 端口。确需并行运行时，必须为其中一个客户端改用其他回环端口并同步其 TUN/DNS 设置。

当前策略是让 AI、Google、Microsoft 等境外重点域名的 DNS 经美西节点解析；CN、私网、连通性和 NTP 保留直连 DoH 例外，以维持国内服务和系统联网检测可用。因此它不是“任何公共域名都不产生本地 DNS 请求”的绝对零泄漏模式。

如果这些字段在最终配置中消失或被改写，优先检查是否误选了 `内置-覆写`，以及订阅链接是否携带了客户端覆写参数。Clash Mi 官方也记录过 `内置-覆写` 清空 `proxy-server-nameserver` 导致自定义 DNS 失效的问题：[相关问题 #485](https://github.com/KaringX/clashmi/issues/485)。

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

本项目的 YAML 没有 `tun` 段，因此上述“如果 TUN 来自配置文件”的例外不适用；这里保持 TUN 覆写开启，由 Clash Mi 注入平台参数，同时关闭“内置覆写”以保护 DNS、策略组和规则。

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
