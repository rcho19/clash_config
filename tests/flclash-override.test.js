const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const overridePath = path.resolve(__dirname, "..", "override", "flclash-override.js");
const overrideSource = fs.readFileSync(overridePath, "utf8");

const createRunner = ({ directDomains = [], proxyDomains = [] } = {}) => {
  const source = overrideSource
    .replace(
      "const USER_DIRECT_DOMAINS = [];",
      `const USER_DIRECT_DOMAINS = ${JSON.stringify(directDomains)};`
    )
    .replace(
      "const USER_PROXY_DOMAINS = [];",
      `const USER_PROXY_DOMAINS = ${JSON.stringify(proxyDomains)};`
    );
  const context = vm.createContext({});
  vm.runInContext(`${source}\n;globalThis.__applyOverride = main;`, context, {
    filename: overridePath
  });

  return (config) => {
    const input = config === undefined ? undefined : structuredClone(config);
    const result = context.__applyOverride(input);
    return JSON.parse(JSON.stringify(result));
  };
};

const applyOverride = createRunner();

test("单节点配置补建 PROXY，且不自定义 GLOBAL/AI/MEDIA", () => {
  const result = applyOverride({
    proxies: [
      { name: "backup", type: "ss" },
      { name: "la9929-vless-reality", type: "vless", tls: true }
    ],
    tun: { enable: false, stack: "gvisor" }
  });

  assert.deepEqual(result["proxy-groups"], [
    {
      name: "PROXY",
      type: "select",
      proxies: ["la9929-vless-reality", "backup"]
    }
  ]);
  assert.equal(result.proxies[0]["client-fingerprint"], undefined);
  assert.equal(result.proxies[1]["client-fingerprint"], "chrome");
  assert.equal(result.tun.enable, false);
  assert.equal(result.tun.stack, "gvisor");
  assert.equal(result.tun["strict-route"], true);
  assert.equal(result.tun["auto-detect-interface"], true);
  assert.equal("route-exclude-address" in result.tun, false);
  assert.deepEqual(result.dns.nameserver, [
    "https://1.1.1.1/dns-query#PROXY",
    "https://8.8.8.8/dns-query#PROXY"
  ]);
  assert.equal(result.dns["fake-ip-filter"].includes("+.cn"), false);
  assert.equal(result.rules.at(-1), "MATCH,PROXY");
});

test("已有 PROXY 与显式 GLOBAL 完整保留", () => {
  const groups = [
    { name: "PROXY", type: "select", proxies: ["LAX"], icon: "proxy.png" },
    { name: "GLOBAL", type: "select", proxies: ["PROXY", "DIRECT"], icon: "global.png" },
    { name: "custom", type: "fallback", proxies: ["LAX"], url: "https://example.com" }
  ];
  const result = applyOverride({
    proxies: [{ name: "LAX", type: "vless" }],
    "proxy-groups": groups
  });

  assert.deepEqual(result["proxy-groups"], groups);
});

test("provider-only 配置通过 use 构造 PROXY", () => {
  const result = applyOverride({
    "proxy-providers": {
      primary: { type: "http", url: "https://example.com/sub" },
      backup: { type: "file", path: "./backup.yaml" }
    }
  });

  assert.deepEqual(result["proxy-groups"][0], {
    name: "PROXY",
    type: "select",
    use: ["primary", "backup"]
  });
  assert.equal(result.rules.at(-1), "MATCH,PROXY");
});

test("只有其他策略组时以安全的 PROXY 包装复用", () => {
  const result = applyOverride({
    "proxy-groups": [{ name: "main", type: "select", proxies: ["node-from-provider"] }]
  });

  assert.deepEqual(result["proxy-groups"][0], {
    name: "PROXY",
    type: "select",
    proxies: ["main"]
  });
});

test("显式 GLOBAL 预留 PROXY 引用时补建同名组", () => {
  const globalGroup = { name: "GLOBAL", type: "select", proxies: ["PROXY", "DIRECT"] };
  const result = applyOverride({
    proxies: [{ name: "LAX", type: "vless" }],
    "proxy-groups": [globalGroup]
  });

  assert.equal(result["proxy-groups"][0].name, "PROXY");
  assert.deepEqual(result["proxy-groups"][1], globalGroup);
  assert.equal(result.rules.at(-1), "MATCH,PROXY");
});

test("PROXY 名称冲突时生成独立组名并同步 DNS 与规则", () => {
  const result = applyOverride({
    proxies: [{ name: "PROXY", type: "vless" }]
  });

  assert.equal(result["proxy-groups"][0].name, "FLCLASH-PROXY");
  assert.deepEqual(result["proxy-groups"][0].proxies, ["PROXY"]);
  assert.equal(result.dns.nameserver[0], "https://1.1.1.1/dns-query#FLCLASH-PROXY");
  assert.equal(result.rules.at(-1), "MATCH,FLCLASH-PROXY");
});

test("无可用代理出口时保持原配置不动", () => {
  assert.deepEqual(applyOverride({}), {});
  assert.deepEqual(applyOverride(undefined), {});
});

test("DNS 配置移除 fallback/旧 rules，保留安全的用户项", () => {
  const result = applyOverride({
    proxies: [{ name: "LAX", type: "vless" }],
    dns: {
      listen: "0.0.0.0:1053",
      fallback: ["system://"],
      "fallback-filter": { geoip: true },
      rules: ["legacy"],
      "fake-ip-filter": ["+.custom.example", "+.stun.example"],
      "nameserver-policy": {
        "+.custom.example": ["https://custom.example/dns-query#DIRECT"],
        "+.google.com": ["system://"]
      }
    }
  });

  assert.equal(result.dns.listen, "0.0.0.0:1053");
  assert.equal("fallback" in result.dns, false);
  assert.equal("fallback-filter" in result.dns, false);
  assert.equal("rules" in result.dns, false);
  assert.equal(result.dns["direct-nameserver-follow-policy"], false);
  assert.equal(result.dns["fake-ip-filter"].includes("+.custom.example"), true);
  assert.equal(result.dns["fake-ip-filter"].includes("+.stun.example"), false);
  assert.deepEqual(result.dns["nameserver-policy"]["+.custom.example"], [
    "https://custom.example/dns-query#DIRECT"
  ]);
  assert.deepEqual(result.dns["nameserver-policy"]["+.google.com"], result.dns.nameserver);
});

test("节点级 TLS 指纹保留显式值并清理已移除的全局字段", () => {
  const result = applyOverride({
    "global-client-fingerprint": "chrome",
    proxies: [
      { name: "VMess", type: "vmess", tls: true, "client-fingerprint": "firefox" },
      { name: "Trojan", type: "trojan" },
      { name: "Plain VLESS", type: "vless", tls: false },
      { name: "SS", type: "ss" }
    ]
  });

  assert.equal("global-client-fingerprint" in result, false);
  assert.equal(result.proxies[0]["client-fingerprint"], "firefox");
  assert.equal(result.proxies[1]["client-fingerprint"], "chrome");
  assert.equal(result.proxies[2]["client-fingerprint"], undefined);
  assert.equal(result.proxies[3]["client-fingerprint"], undefined);
});

test("规则覆盖 Google/Microsoft/连通性且不使用宽泛 STUN 关键词", () => {
  const result = applyOverride({
    proxies: [{ name: "LAX", type: "vless" }],
    rules: ["DOMAIN-SUFFIX,intranet.example,DIRECT", "MATCH,DIRECT"]
  });

  assert.equal(result.rules.includes("DOMAIN-SUFFIX,antigravity.google,PROXY"), true);
  assert.equal(result.rules.includes("GEOSITE,google,PROXY"), true);
  assert.equal(result.rules.includes("GEOSITE,microsoft,PROXY"), true);
  assert.equal(result.rules.includes("DOMAIN-SUFFIX,msftconnecttest.com,DIRECT"), true);
  assert.equal(result.rules.includes("DOMAIN-SUFFIX,intranet.example,DIRECT"), true);
  assert.equal(result.rules.some((rule) => /^DOMAIN-KEYWORD,(?:stun|turn),/i.test(rule)), false);
  assert.equal(result.rules.includes("AND,((NETWORK,UDP),(DST-PORT,3478)),REJECT"), true);
  assert.equal(new Set(result.rules).size, result.rules.length);
});

test("自定义直连子域优先于预置代理父域", () => {
  const run = createRunner({ directDomains: ["accounts.google.com"] });
  const result = run({ proxies: [{ name: "LAX", type: "vless" }] });
  const directIndex = result.rules.indexOf("DOMAIN-SUFFIX,accounts.google.com,DIRECT");
  const proxyIndex = result.rules.indexOf("DOMAIN-SUFFIX,google.com,PROXY");

  assert.ok(directIndex > -1);
  assert.ok(proxyIndex > -1);
  assert.ok(directIndex < proxyIndex);
});

test("重复执行结果稳定", () => {
  const once = applyOverride({
    proxies: [{ name: "LAX", type: "vless" }],
    rules: ["DOMAIN-SUFFIX,intranet.example,DIRECT"]
  });
  const twice = applyOverride(once);

  assert.deepEqual(twice, once);
});
