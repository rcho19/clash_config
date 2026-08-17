// FlClash 脚本覆写
//
// FlClash 会在本脚本执行后再次写入端口、运行模式、IPv6、TUN 基础参数、
// GeoData URL 和 store-selected 等客户端设置，因此这里仅配置脚本真正能稳定控制的内容。

// 自定义域名只填写纯域名，不要包含协议、路径或通配符。
const USER_DIRECT_DOMAINS = [];
const USER_PROXY_DOMAINS = [];

const SETTINGS = {
  SINGLE_TARGET_TEST_URL: "https://www.gstatic.com/generate_204",
  SINGLE_TARGET_INTERVAL: 300,
  STRICT_BLOCK_QUIC: false,
  STRICT_BLOCK_STUN: true
};

// AI 与 MEDIA 只作为路由分类存在，不再保留同名策略组。
const REDUNDANT_GROUP_NAMES = new Set(["AI", "MEDIA"]);

const LEAK_CHECK_DOMAINS = [
  "browserleaks.com",
  "ipleak.net",
  "ipinfo.io",
  "ifconfig.me",
  "ifconfig.co",
  "ip.sb",
  "ip-api.com",
  "myip.com",
  "whoer.net",
  "whatismyipaddress.com",
  "cloudflare.com"
];

const GOOGLE_DOMAINS = [
  "antigravity.google",
  "google.com",
  "googleapis.com",
  "gstatic.com",
  "ggpht.com",
  "googleusercontent.com",
  "googlevideo.com"
];

const MICROSOFT_DOMAINS = [
  "microsoft.com",
  "microsoftonline.com",
  "live.com",
  "xboxlive.com",
  "bing.com",
  "bingapis.com"
];

const AI_DOMAINS = [
  "openai.com",
  "chatgpt.com",
  "oaistatic.com",
  "oaiusercontent.com",
  "auth0.com",
  "intercom.io",
  "intercomcdn.com",
  "anthropic.com",
  "claude.ai",
  "claudeusercontent.com",
  "gemini.google.com",
  "generativelanguage.googleapis.com",
  "aistudio.google.com",
  "ai.google.dev",
  "makersuite.google.com",
  "perplexity.ai",
  "x.ai",
  "grok.com",
  "huggingface.co",
  "hf.co",
  "hf.space",
  "replicate.com",
  "cohere.com",
  "mistral.ai",
  "openrouter.ai",
  "copilot.microsoft.com"
];

const MEDIA_DOMAINS = [
  "youtube.com",
  "youtu.be",
  "ytimg.com",
  "netflix.com",
  "nflxvideo.net",
  "disneyplus.com",
  "spotify.com"
];

const SOCIAL_DOMAINS = [
  "x.com",
  "twitter.com",
  "twimg.com",
  "t.co",
  "instagram.com",
  "cdninstagram.com",
  "threads.net",
  "facebook.com",
  "facebook.net",
  "fb.com",
  "fbcdn.net",
  "fbsbx.com",
  "messenger.com",
  "whatsapp.com",
  "whatsapp.net"
];

const OTHER_PROXY_DOMAINS = [
  "github.com",
  "githubusercontent.com",
  "githubassets.com",
  "gitlab.com",
  "reddit.com",
  "discord.com",
  "discordapp.com",
  "t.me"
];

const unique = (items = []) => [...new Set(items.filter(Boolean))];

const isPlainObject = (value) =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const omitKeys = (value = {}, keys = []) => {
  const result = { ...value };
  keys.forEach((key) => delete result[key]);
  return result;
};

const normalizeDomains = (domains = []) =>
  unique(
    domains
      .map((domain) => String(domain || "").trim().toLowerCase())
      .filter((domain) => domain && !domain.includes("://") && !domain.includes("/") && !domain.includes("*"))
      .map((domain) => domain.replace(/^\+\./, "").replace(/^\./, ""))
  );

const getProxyNames = (config) =>
  unique(
    (Array.isArray(config.proxies) ? config.proxies : [])
      .map((proxy) => proxy && proxy.name)
      .filter((name) => name && !["DIRECT", "REJECT", "REJECT-DROP", "PASS"].includes(name))
  );

const getProxyProviders = (config) =>
  isPlainObject(config["proxy-providers"]) ? config["proxy-providers"] : {};

const getProxyGroups = (config) =>
  (Array.isArray(config["proxy-groups"]) ? config["proxy-groups"] : []).filter(
    (group) => isPlainObject(group) && group.name
  );

const getGroupProxyNames = (group) =>
  unique(
    (Array.isArray(group && group.proxies) ? group.proxies : [])
      .map((name) => String(name || "").trim())
      .filter(Boolean)
  );

const getGroupProviderNames = (group) =>
  unique(
    (Array.isArray(group && group.use) ? group.use : [])
      .map((name) => String(name || "").trim())
      .filter(Boolean)
  );

const hasDynamicGroupSource = (group) =>
  getGroupProviderNames(group).length > 0 ||
  group["include-all"] === true ||
  group["include-all-proxies"] === true ||
  group["include-all-providers"] === true;

const hasUsableGroupSource = (group) =>
  getGroupProxyNames(group).length > 0 || hasDynamicGroupSource(group);

const isRedundantGroupName = (name) =>
  REDUNDANT_GROUP_NAMES.has(String(name || "").trim().toUpperCase());

// 删除旧版脚本或订阅遗留的 AI/MEDIA 组，并递归清理仅引用这些组的空壳组。
const removeRedundantGroups = (config) => {
  const hadProxyGroups = Array.isArray(config["proxy-groups"]);
  let groups = getProxyGroups(config);
  const removedNames = new Set(
    groups.filter((group) => isRedundantGroupName(group.name)).map((group) => group.name)
  );

  groups = groups.filter((group) => !removedNames.has(group.name));

  let changed = true;
  while (changed) {
    changed = false;
    const nextGroups = [];

    groups.forEach((group) => {
      const originalProxyNames = getGroupProxyNames(group);
      const proxyNames = originalProxyNames.filter((name) => !removedNames.has(name));
      const cleanedGroup = Array.isArray(group.proxies)
        ? { ...group, proxies: proxyNames }
        : group;

      if (
        originalProxyNames.length > 0 &&
        proxyNames.length === 0 &&
        !hasDynamicGroupSource(cleanedGroup)
      ) {
        removedNames.add(group.name);
        changed = true;
        return;
      }

      if (proxyNames.length !== originalProxyNames.length) changed = true;
      nextGroups.push(cleanedGroup);
    });

    groups = nextGroups;
  }

  if (hadProxyGroups || removedNames.size > 0) {
    config["proxy-groups"] = groups;
  }
};

// FlClash 会回放旧 selectedMap。单候选 select 改为自动计算型 fallback 后，
// 不再受失效旧选择影响，界面与内核都会直接使用唯一候选。
const normalizeSingleCandidateGroups = (config) => {
  const groups = getProxyGroups(config).map((group) => {
    const proxyNames = getGroupProxyNames(group);
    if (
      String(group.type || "").toLowerCase() !== "select" ||
      proxyNames.length !== 1 ||
      hasDynamicGroupSource(group)
    ) {
      return group;
    }

    return {
      ...group,
      type: "fallback",
      proxies: proxyNames,
      url:
        typeof group.url === "string" && group.url.trim()
          ? group.url
          : SETTINGS.SINGLE_TARGET_TEST_URL,
      interval:
        Number.isFinite(group.interval) && group.interval > 0
          ? group.interval
          : SETTINGS.SINGLE_TARGET_INTERVAL,
      lazy: typeof group.lazy === "boolean" ? group.lazy : true
    };
  });

  config["proxy-groups"] = groups;
};

const findAvailableGroupName = (config, baseName = "PROXY", additionalReservedNames = []) => {
  const reservedNames = new Set([
    ...getProxyNames(config),
    ...Object.keys(getProxyProviders(config)),
    ...getProxyGroups(config).map((group) => group.name),
    ...additionalReservedNames
  ]);

  if (!reservedNames.has(baseName)) return baseName;

  const fallbackName = `FLCLASH-${baseName}`;
  if (!reservedNames.has(fallbackName)) return fallbackName;

  let index = 2;
  while (reservedNames.has(`${fallbackName}-${index}`)) index += 1;
  return `${fallbackName}-${index}`;
};

// 保留订阅节点的原始顺序，不根据节点名称、地区或协议猜测优先级。
const ensureProxyTarget = (config) => {
  const groups = getProxyGroups(config);
  const existingProxyGroup = groups.find((group) => group.name === "PROXY");
  if (existingProxyGroup && hasUsableGroupSource(existingProxyGroup)) return "PROXY";

  const proxyNames = getProxyNames(config);
  const providerNames = Object.keys(getProxyProviders(config));
  const fallbackGroup = groups.find(
    (group) => group.name !== "GLOBAL" && group.name !== "PROXY" && hasUsableGroupSource(group)
  );

  if (!proxyNames.length && !providerNames.length && !fallbackGroup) return null;

  const fallbackReferences =
    !proxyNames.length && !providerNames.length && fallbackGroup && Array.isArray(fallbackGroup.proxies)
      ? fallbackGroup.proxies
      : [];
  const groupName = findAvailableGroupName(config, "PROXY", fallbackReferences);
  const group = {
    name: groupName,
    type: "select"
  };

  if (proxyNames.length) {
    group.proxies = proxyNames;
  } else if (fallbackGroup) {
    group.proxies = [fallbackGroup.name];
  }

  if (providerNames.length) {
    group.use = providerNames;
  }

  config["proxy-groups"] = [
    group,
    ...groups.filter((existingGroup) => existingGroup.name !== "PROXY")
  ];
  return groupName;
};

// 显式 GLOBAL 只跟随实际代理出口，避免内置 GLOBAL 和旧选择状态显示为空。
const ensureGlobalTarget = (config, proxyTarget) => {
  const groups = getProxyGroups(config);
  const existingGlobal = groups.find((group) => group.name === "GLOBAL");
  const preservedGlobal = existingGlobal
    ? omitKeys(existingGlobal, [
        "type",
        "proxies",
        "use",
        "filter",
        "exclude-filter",
        "exclude-type",
        "include-all",
        "include-all-proxies",
        "include-all-providers",
        "strategy"
      ])
    : {};
  const globalGroup = {
    ...preservedGlobal,
    name: "GLOBAL",
    type: "select",
    proxies: [proxyTarget]
  };
  const groupsWithoutGlobal = groups.filter((group) => group.name !== "GLOBAL");
  const proxyIndex = groupsWithoutGlobal.findIndex((group) => group.name === proxyTarget);
  const insertIndex = proxyIndex >= 0 ? proxyIndex + 1 : 0;

  config["proxy-groups"] = [
    ...groupsWithoutGlobal.slice(0, insertIndex),
    globalGroup,
    ...groupsWithoutGlobal.slice(insertIndex)
  ];
};

const applyGeoData = (config) => {
  config["geodata-mode"] = true;
  config["geo-auto-update"] = true;
  config["geo-update-interval"] = 24;
  // FlClash 会在脚本执行后用“基础配置”中的地址覆盖 geox-url，因此这里不写入。
};

const applyProfile = (config) => {
  const profile = isPlainObject(config.profile) ? config.profile : {};
  config.profile = {
    ...profile,
    "store-fake-ip": false
  };
  // store-selected 由 FlClash 自己维护，客户端会在脚本执行后强制设为 false。
};

const applyProxyDefaults = (config) => {
  const proxies = Array.isArray(config.proxies) ? config.proxies : [];

  proxies.forEach((proxy) => {
    if (!isPlainObject(proxy) || "client-fingerprint" in proxy) return;

    const type = String(proxy.type || "").toLowerCase();
    const alwaysUsesTls = type === "trojan" || type === "anytls";
    const optionallyUsesTls =
      (type === "vmess" || type === "vless") &&
      (proxy.tls === true || isPlainObject(proxy["reality-opts"]));

    if (alwaysUsesTls || optionallyUsesTls) {
      proxy["client-fingerprint"] = "chrome";
    }
  });

  // Mihomo v1.19.30 已移除全局 TLS 指纹，旧字段会产生配置错误。
  delete config["global-client-fingerprint"];
};

const applySniffer = (config) => {
  const sniffer = isPlainObject(config.sniffer) ? config.sniffer : {};
  const sniff = isPlainObject(sniffer.sniff) ? sniffer.sniff : {};

  config.sniffer = {
    ...sniffer,
    enable: true,
    "force-dns-mapping": true,
    "parse-pure-ip": true,
    "override-destination": true,
    sniff: {
      ...sniff,
      HTTP: {
        ...(isPlainObject(sniff.HTTP) ? sniff.HTTP : {}),
        ports: [80, "8080-8880"],
        "override-destination": true
      },
      TLS: {
        ...(isPlainObject(sniff.TLS) ? sniff.TLS : {}),
        ports: [443, 8443]
      },
      QUIC: {
        ...(isPlainObject(sniff.QUIC) ? sniff.QUIC : {}),
        ports: [443, 8443]
      }
    }
  };
};

const applyTun = (config) => {
  const tun = isPlainObject(config.tun) ? config.tun : {};
  config.tun = {
    ...tun,
    "auto-detect-interface": true,
    "strict-route": true
  };

  // enable、stack、auto-route、route-address 与 dns-hijack 最终由 FlClash 设置决定。
  // 不在这里声明 route-exclude-address，避免局域网地址直接绕过 TUN。
};

const applyDns = (config, proxyTarget, directDomains, proxyDomains) => {
  const chinaDns = [
    "https://dns.alidns.com/dns-query#DIRECT",
    "https://doh.pub/dns-query#DIRECT"
  ];
  const foreignDns = [
    `https://1.1.1.1/dns-query#${proxyTarget}`,
    `https://8.8.8.8/dns-query#${proxyTarget}`
  ];
  const directGeoRules = [
    "geosite:private",
    "geosite:cn",
    "geosite:synology",
    "geosite:category-game-platforms-download@cn",
    "geosite:category-ntp",
    "geosite:connectivity-check"
  ];
  const foreignGeoRules = [
    "geosite:category-ai-!cn",
    "geosite:google",
    "geosite:microsoft",
    "geosite:telegram",
    "geosite:gfw"
  ];
  const connectivityDomains = ["msftconnecttest.com", "msftncsi.com"];
  const existingDns = isPlainObject(config.dns) ? config.dns : {};
  const existingPolicy = isPlainObject(existingDns["nameserver-policy"])
    ? existingDns["nameserver-policy"]
    : {};
  const existingFakeIpFilter = Array.isArray(existingDns["fake-ip-filter"])
    ? existingDns["fake-ip-filter"].filter((item) => !/^\+?\.?(?:stun|turn)/i.test(String(item)))
    : [];
  const nameserverPolicy = { ...existingPolicy };

  connectivityDomains.forEach((domain) => {
    nameserverPolicy[`+.${domain}`] = chinaDns;
  });
  directDomains.forEach((domain) => {
    nameserverPolicy[`+.${domain}`] = chinaDns;
  });
  directGeoRules.forEach((rule) => {
    nameserverPolicy[rule] = chinaDns;
  });
  proxyDomains.forEach((domain) => {
    nameserverPolicy[`+.${domain}`] = foreignDns;
  });
  foreignGeoRules.forEach((rule) => {
    nameserverPolicy[rule] = foreignDns;
  });

  const preservedDns = omitKeys(existingDns, [
    "nameserver",
    "fallback",
    "fallback-filter",
    "nameserver-policy",
    "default-nameserver",
    "proxy-server-nameserver",
    "direct-nameserver",
    "direct-nameserver-follow-policy",
    "fake-ip-filter",
    "rules"
  ]);

  config.dns = {
    ...preservedDns,
    enable: true,
    ipv6: false,
    "cache-algorithm": "arc",
    "prefer-h3": false,
    "use-hosts": true,
    "use-system-hosts": false,
    "respect-rules": true,
    "enhanced-mode": "fake-ip",
    "fake-ip-range": "198.18.0.1/16",
    "fake-ip-filter-mode": "blacklist",
    "fake-ip-filter": unique([
      "*.lan",
      "*.local",
      "localhost",
      "localhost.ptlogin2.qq.com",
      "+.msftconnecttest.com",
      "+.msftncsi.com",
      "time.*.com",
      "time.*.gov",
      "time.*.edu.cn",
      "time.*.apple.com",
      "time-ios.apple.com",
      "+.pool.ntp.org",
      "geosite:private",
      "geosite:category-ntp",
      "geosite:connectivity-check",
      ...existingFakeIpFilter
    ]),
    "default-nameserver": ["223.5.5.5", "119.29.29.29"],
    nameserver: foreignDns,
    "nameserver-policy": nameserverPolicy,
    "proxy-server-nameserver": [
      "https://doh.pub/dns-query#DIRECT",
      "https://dns.alidns.com/dns-query#DIRECT"
    ],
    "direct-nameserver": chinaDns,
    "direct-nameserver-follow-policy": false
  };

  config.hosts = {
    ...(isPlainObject(config.hosts) ? config.hosts : {}),
    "dns.alidns.com": ["223.5.5.5", "223.6.6.6"],
    "doh.pub": ["1.12.12.12", "120.53.53.53"]
  };
};

const getPreservedDirectRules = (config) =>
  (Array.isArray(config.rules) ? config.rules : []).filter((rule) => {
    const value = String(rule || "").trim();
    return value && !value.startsWith("#") && !/^MATCH,/i.test(value) && /,DIRECT(?:,|$)/i.test(value);
  });

const buildNetworkBlockRules = () => [
  ...(SETTINGS.STRICT_BLOCK_QUIC
    ? ["AND,((NETWORK,UDP),(DST-PORT,443)),REJECT"]
    : []),
  ...(SETTINGS.STRICT_BLOCK_STUN
    ? [
        "AND,((NETWORK,UDP),(DST-PORT,3478)),REJECT",
        "AND,((NETWORK,UDP),(DST-PORT,5349)),REJECT",
        "AND,((NETWORK,UDP),(DST-PORT,19302)),REJECT"
      ]
    : [])
];

const applyRules = (config, proxyTarget, directDomains, proxyDomains) => {
  const preservedDirectRules = getPreservedDirectRules(config);

  config.rules = unique([
    "GEOSITE,category-ads-all,REJECT",
    ...directDomains.map((domain) => `DOMAIN-SUFFIX,${domain},DIRECT`),
    ...proxyDomains.map((domain) => `DOMAIN-SUFFIX,${domain},${proxyTarget}`),

    "GEOSITE,private,DIRECT",
    "GEOIP,private,DIRECT,no-resolve",
    "DOMAIN-SUFFIX,local,DIRECT",
    "DOMAIN-SUFFIX,lan,DIRECT",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,169.254.0.0/16,DIRECT,no-resolve",
    "DOMAIN-SUFFIX,msftconnecttest.com,DIRECT",
    "DOMAIN-SUFFIX,msftncsi.com,DIRECT",
    "GEOSITE,connectivity-check,DIRECT",

    ...buildNetworkBlockRules(),

    `GEOSITE,category-ai-!cn,${proxyTarget}`,
    `GEOSITE,telegram,${proxyTarget}`,
    `GEOSITE,google,${proxyTarget}`,
    `GEOSITE,microsoft,${proxyTarget}`,
    `GEOSITE,gfw,${proxyTarget}`,

    ...preservedDirectRules,
    "GEOSITE,synology,DIRECT",
    "GEOSITE,category-game-platforms-download@cn,DIRECT",
    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",
    `MATCH,${proxyTarget}`
  ]);
};

function main(input) {
  const config = isPlainObject(input) ? input : {};
  removeRedundantGroups(config);
  const proxyTarget = ensureProxyTarget(config);

  // 没有节点、Provider 或可复用策略组时，无法构造合法的代理规则，保持原配置不动。
  if (!proxyTarget) return config;

  ensureGlobalTarget(config, proxyTarget);
  normalizeSingleCandidateGroups(config);

  const directDomains = normalizeDomains(USER_DIRECT_DOMAINS);
  const proxyDomains = normalizeDomains([
    ...USER_PROXY_DOMAINS,
    ...LEAK_CHECK_DOMAINS,
    ...GOOGLE_DOMAINS,
    ...MICROSOFT_DOMAINS,
    ...AI_DOMAINS,
    ...MEDIA_DOMAINS,
    ...SOCIAL_DOMAINS,
    ...OTHER_PROXY_DOMAINS
  ]).filter((domain) => !directDomains.includes(domain));

  applyGeoData(config);
  applyProfile(config);
  applyProxyDefaults(config);
  applySniffer(config);
  applyTun(config);
  applyDns(config, proxyTarget, directDomains, proxyDomains);
  applyRules(config, proxyTarget, directDomains, proxyDomains);

  return config;
}
