// ====================
// 0. 特殊域名处理(手动添加)
// ====================

// 强制直连
const BYPASS_DOMAINS = [
  "example.com", "example.org"
];

// 强制代理
const FORCE_PROXY_DOMAINS = [
  "test.com", "test.org"
];

// ====================
// 1. 常量配置
// ====================
const SETTINGS = {
  ICON_BASE: "https://cdn.jsdelivr.net/gh/Koolson/Qure@master/IconSet/Color/",
  GEOIP_URL: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat",
  GEOSITE_URL: "https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat",

  REGION_ORDER: ["HK", "TW", "SG", "JP", "KR", "AS", "US"],
  AI_REGION_ORDER: ["US", "JP", "SG", "TW", "KR", "AS"],
  TG_REGION_ORDER: ["SG", "JP", "US", "TW", "KR"],
  STRICT_BLOCK_QUIC: false,
  STRICT_BLOCK_STUN: false,

  FILTER_REGEX: /群|邀请|返利|官网|官方|网址|订阅|购买|续费|剩余|到期|过期|流量|备用|邮箱|客服|联系|工单|倒卖|防止|梯子|tg|telegram|电报|发布|重置/i
};

// ====================
// 2. 基础工具
// ====================
const uniq = (arr = []) => [...new Set(arr.filter(Boolean))];

const escapeRegex = (s = "") =>
  String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const normalizeName = (name = "") =>
  String(name)
    .replace(/(IEPL|IPLC|BGP|RELAY|PRO|V\d+)/ig, " $1 ")
    .replace(/[【】\[\]（）()|_\-.,/:~]/g, " ")
    .replace(/🇭🇰/g, " HK ")
    .replace(/🇹🇼/g, " TW ")
    .replace(/🇸🇬/g, " SG ")
    .replace(/🇯🇵/g, " JP ")
    .replace(/🇰🇷/g, " KR ")
    .replace(/🇻🇳|🇹🇭|🇲🇾|🇮🇩|🇵🇭/g, " AS ")
    .replace(/🇺🇸/g, " US ")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

const buildRegex = (arr = []) =>
  new RegExp(
    arr
      .map((raw) => {
        const token = String(raw).trim().toUpperCase();
        const escaped = escapeRegex(token);
        return /^[A-Z]{2,3}$/.test(token)
          ? `(?:^|[^A-Z])${escaped}(?:[^A-Z]|$)`
          : escaped;
      })
      .join("|"),
    "i"
  );

const buildRegions = () =>
  ([
    { name: "HK", pattern: ["香港", "HK", "HKG", "HONGKONG", "HONG KONG"], icon: "Hong_Kong.png" },
    { name: "TW", pattern: ["台湾", "台北", "新北", "TW", "TWN", "TAIWAN", "TAIPEI", "TPE"], icon: "Taiwan.png" },
    { name: "SG", pattern: ["新加坡", "狮城", "SG", "SGP", "SINGAPORE", "SIN"], icon: "Singapore.png" },
    { name: "JP", pattern: ["日本", "东京", "大阪", "JP", "JPN", "JAPAN", "TOKYO", "OSAKA", "NRT", "HND", "TYO"], icon: "Japan.png" },
    { name: "KR", pattern: ["韩国", "首尔", "KR", "KOR", "KOREA", "SEOUL", "ICN"], icon: "Korea.png" },
    { name: "AS",
      pattern: [
        "越南", "泰国", "马来西亚", "印尼", "菲律宾",
        "VN", "TH", "MY", "ID", "PH",
        "VIETNAM", "THAILAND", "MALAYSIA", "INDONESIA", "PHILIPPINES", "MANILA"
      ],
      icon: "Available.png"
    },
    { name: "US",
      pattern: [
        "美国", "纽约", "洛杉矶", "旧金山", "圣何塞", "西雅图", "芝加哥", "达拉斯", "硅谷",
        "US", "USA",
        "UNITEDSTATES", "UNITED STATES",
        "NEWYORK", "NEW YORK",
        "LOSANGELES", "LOS ANGELES",
        "SANFRANCISCO", "SAN FRANCISCO",
        "SANJOSE", "SAN JOSE",
        "SEATTLE", "CHICAGO", "DALLAS", "LAX", "SJC", "SFO"
      ],
      icon: "United_States.png"
    }
  ]).map((r) => ({ ...r, regex: buildRegex(r.pattern) }));

const REGIONS = buildRegions();

const buildFakeIpFilter = (bypass = []) =>
  uniq([
    "geosite:private",
    "geosite:google-cn",
    "geosite:synology",
    "geosite:cn",
    ...uniq(
      bypass.flatMap((domain) => {
        const d = String(domain || "").trim();
        if (!d) return [];
        return d.includes("*") || d.startsWith("+.") ? [d] : [`+.${d}`];
      })
    )
  ]);

const RESERVED_PROXY_NAMES = new Set([
  "main",
  "All",
  "ai",
  "tg",
  "Other",
  "info",
  "GLOBAL",
  "DIRECT",
  "REJECT",
  "REJECT-DROP",
  "PASS",
  ...SETTINGS.REGION_ORDER
]);

const mergeRules = (baseRules = [], extraRules = []) => {
  const extra = Array.isArray(extraRules) ? extraRules.filter(Boolean) : [];
  if (!extra.length) return baseRules.slice();

  const matchIndex = baseRules.findIndex(
    (rule) => String(rule).trim().toUpperCase() === "MATCH,MAIN"
  );

  if (matchIndex === -1) return uniq([...baseRules, ...extra]);

  return uniq([
    ...baseRules.slice(0, matchIndex),
    ...extra,
    ...baseRules.slice(matchIndex)
  ]);
};

const pickDirectRules = (rules = []) =>
  rules.filter((rule) => {
    const r = String(rule || "").trim();
    if (!r || r.startsWith("#")) return false;
    if (/^MATCH,/i.test(r)) return false;
    return /,DIRECT(?:,|$)/i.test(r);
  });

const omitKeys = (obj = {}, keys = []) => {
  const out = { ...obj };
  keys.forEach((key) => delete out[key]);
  return out;
};

const buildStrictNetworkRules = () => [
  ...(SETTINGS.STRICT_BLOCK_QUIC
    ? ["AND,((NETWORK,UDP),(DST-PORT,443)),REJECT"]
    : []),
  ...(SETTINGS.STRICT_BLOCK_STUN
    ? [
        "DOMAIN-KEYWORD,stun,REJECT",
        "AND,((NETWORK,UDP),(DST-PORT,3478)),REJECT",
        "AND,((NETWORK,UDP),(DST-PORT,5349)),REJECT",
        "AND,((NETWORK,UDP),(DST-PORT,19302)),REJECT"
      ]
    : [])
];

// ====================
// 3. 固定规则
// ====================
const STATIC_RULES = [
  "GEOSITE,category-ads-all,REJECT",
  ...uniq(FORCE_PROXY_DOMAINS).map((d) => `DOMAIN-SUFFIX,${d},main`),
  ...uniq(BYPASS_DOMAINS).map((d) => `DOMAIN-SUFFIX,${d},DIRECT`),
  "GEOSITE,private,DIRECT",
  "GEOIP,private,DIRECT,no-resolve",
  ...buildStrictNetworkRules(),
  "GEOSITE,google-cn,DIRECT",
  "GEOSITE,synology,DIRECT",
  "DOMAIN-SUFFIX,sharepoint.com,DIRECT",
  "GEOSITE,microsoft@cn,DIRECT",
  "GEOSITE,category-game-platforms-download@cn,DIRECT",
  "GEOSITE,category-ai-!cn,ai", // 精准路由至 ai 策略组
  "GEOSITE,telegram,tg",         // 精准路由至 tg 策略组
  "GEOSITE,gfw,main",
  "GEOSITE,cn,DIRECT",
  "GEOIP,CN,DIRECT,no-resolve",
  "MATCH,main"
];

const STATIC_FAKE_IP_FILTER = buildFakeIpFilter(BYPASS_DOMAINS);

// ====================
// 4. 节点处理
// ====================
const ensureConfigObject = (input) =>
  input && typeof input === "object" ? input : {};

const getOriginalProxies = (input) =>
  Array.isArray(input.proxies) ? input.proxies : [];

const makeProxyNamesUnique = (proxies = [], reservedNames = new Set()) => {
  const used = new Set();
  const nextIdx = new Map();

  proxies.forEach((p) => {
    if (!p || !p.name) return;

    const base = String(p.name);

    if (!used.has(base) && !reservedNames.has(base)) {
      used.add(base);
      nextIdx.set(base, 1);
      return;
    }

    const renameBase = reservedNames.has(base) ? `${base}_node` : base;
    let idx = nextIdx.get(renameBase) ?? 0;
    let candidate = idx === 0 ? renameBase : `${renameBase}_${idx}`;

    while (used.has(candidate) || reservedNames.has(candidate)) {
      candidate = `${renameBase}_${++idx}`;
    }

    p.name = candidate;
    used.add(candidate);
    nextIdx.set(renameBase, idx + 1);
  });
};

const splitInfoAndNormalProxies = (proxies = [], filterRegex) =>
  proxies.reduce(
    (acc, proxy) => {
      if (!proxy || !proxy.name) return acc;
      (filterRegex.test(proxy.name) ? acc.infoProxies : acc.normalProxies).push(proxy);
      return acc;
    },
    { infoProxies: [], normalProxies: [] }
  );

const classifyProxiesByRegion = (normalProxies = [], regions = []) => {
  const regionGroupsData = regions.map((r) => ({ name: r.name, icon: r.icon, proxies: [] }));
  const regionGroupMap = new Map(regionGroupsData.map((r) => [r.name, r]));
  const regionSeen = new Map(regionGroupsData.map((r) => [r.name, new Set()]));
  const otherProxyNames = [];
  const otherSeen = new Set();

  normalProxies.forEach((proxy) => {
    const proxyName = proxy.name;
    const normName = normalizeName(proxyName);
    const matchedRegion = regions.find((r) => r.regex.test(normName));

    if (matchedRegion) {
      const group = regionGroupMap.get(matchedRegion.name);
      const seen = regionSeen.get(matchedRegion.name);
      if (group && seen && !seen.has(proxyName)) {
        group.proxies.push(proxyName);
        seen.add(proxyName);
      }
    } else if (!otherSeen.has(proxyName)) {
      otherProxyNames.push(proxyName);
      otherSeen.add(proxyName);
    }
  });

  const activeRegions = regionGroupsData
    .map((r) => ({ ...r, proxies: uniq(r.proxies) }))
    .filter((r) => r.proxies.length > 0);

  const activeRegionNameSet = new Set(activeRegions.map((r) => r.name));
  const activeRegionMap = new Map(activeRegions.map((r) => [r.name, r]));

  return {
    activeRegions,
    activeRegionNameSet,
    activeRegionMap,
    otherProxyNames: uniq(otherProxyNames)
  };
};

// AI 组引用地区组，避免大订阅把所有非 HK 节点直接铺满；无可用非 HK 节点时默认阻断。
const buildAiProxyList = (activeRegionNameSet = new Set(), otherProxyNames = []) => {
  const regionGroups = SETTINGS.AI_REGION_ORDER.filter((rName) =>
    activeRegionNameSet.has(rName)
  );
  const fallbackGroups = otherProxyNames.length ? ["Other"] : [];
  return regionGroups.length || fallbackGroups.length
    ? uniq([...regionGroups, ...fallbackGroups, "REJECT"])
    : ["REJECT"];
};

const buildTgProxyList = (activeRegionNameSet = new Set()) => {
  const regionGroups = SETTINGS.TG_REGION_ORDER.filter((rName) =>
    activeRegionNameSet.has(rName)
  );
  return uniq([...regionGroups, "main"]);
};

// ====================
// 5. 策略组
// ====================
const buildProxyGroups = ({
  allNames,
  aiNames,
  activeRegionMap,
  activeRegionNameSet,
  otherProxyNames
}) => {
  const groups = [];

  const add = (name, type, proxies, icon = "Available.png") => {
    proxies = uniq(proxies);
    if (name && proxies.length) {
      groups.push({
        name,
        type,
        proxies,
        icon: SETTINGS.ICON_BASE + icon
      });
    }
  };

  // 1. 主策略组 main：显示所有节点
  if (allNames.length) {
    add("main", "select", allNames, "Available.png");
  }

  // 2. AI 策略组：排除香港节点
  if (aiNames.length) {
    add("ai", "select", aiNames, "ChatGPT.png");
  }

  // 3. Telegram 策略组：优先分配新加坡组或使用 main 兜底
  if (allNames.length) {
    add("tg", "select", buildTgProxyList(activeRegionNameSet), "Telegram.png");
  }

  // 4. 国家地区策略组：按国家或地区进行节点分流
  SETTINGS.REGION_ORDER.forEach((rName) => {
    const region = activeRegionMap.get(rName);
    if (!region) return;
    add(region.name, "select", region.proxies, region.icon);
  });

  // 5. 剩余节点策略组 Other：收纳未匹配成功的散落节点
  if (otherProxyNames.length) {
    add("Other", "select", otherProxyNames, "Available.png");
  }

  return groups;
};

// ====================
// 6. 网络配置
// ====================
const applyGeoData = (cfg) => {
  cfg["geodata-mode"] = true;
  cfg["geo-auto-update"] = true;
  cfg["geo-update-interval"] = 24;
  cfg["geox-url"] = {
    ...(cfg["geox-url"] || {}),
    geoip: SETTINGS.GEOIP_URL,
    geosite: SETTINGS.GEOSITE_URL
  };
};

const applySniffer = (cfg) => {
  cfg.sniffer = {
    ...(cfg.sniffer || {}),
    enable: true,
    "force-dns-mapping": true,
    "parse-pure-ip": true,
    "override-destination": true,
    sniff: {
      HTTP: { ports: [80, "8080-8880"], "override-destination": true },
      TLS: { ports: [443, 8443] },
      QUIC: { ports: [443, 8443] }
    }
  };
};

const applyTun = (cfg) => {
  cfg.tun = {
    ...(cfg.tun || {}),
    enable: true,
    stack: "system",
    "auto-route": true,
    "auto-detect-interface": true,
    "strict-route": true,
    "dns-hijack": ["any:53", "tcp://any:53"]
  };
};

const applyDns = (cfg) => {
  const dns = cfg.dns || {};
  const fakeIpFilterFromCfg = Array.isArray(dns["fake-ip-filter"]) ? dns["fake-ip-filter"] : [];
  const preservedDns = omitKeys(dns, [
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

  const chinaDNS = [
    "https://dns.alidns.com/dns-query",
    "https://doh.pub/dns-query"
  ];

  // 境外 DNS 显式走 main；代理节点域名解析由 proxy-server-nameserver 直连处理，避免环路。
  const foreignDNS = [
    "https://1.1.1.1/dns-query#main",
    "https://8.8.8.8/dns-query#main"
  ];

  const directGeoForChinaDNS = [
    "geosite:cn",
    "geosite:google-cn",
    "geosite:synology",
    "geosite:googlefcm",
    "geosite:epicgames",
    "geosite:nvidia@cn",
    "geosite:microsoft@cn",
    "geosite:cloudflare@cn",
    "geosite:steam@cn",
    "geosite:category-game-platforms-download@cn",
    "geosite:category-ntp",
    "geosite:connectivity-check"
  ];

  const fullFakeIpFilter = uniq([
    "+.cn",
    "geosite:private",
    ...directGeoForChinaDNS,
    ...STATIC_FAKE_IP_FILTER,
    ...fakeIpFilterFromCfg
  ]);

  cfg.dns = {
    ...preservedDns,
    enable: true,
    listen: "0.0.0.0:1053",
    ipv6: false,
    "cache-algorithm": "arc",
    "prefer-h3": false,
    "use-hosts": true,
    "use-system-hosts": false,
    "respect-rules": true,
    "enhanced-mode": "fake-ip",
    "fake-ip-filter-mode": "blacklist",
    "fake-ip-filter": fullFakeIpFilter,
    "default-nameserver": ["223.5.5.5", "119.29.29.29"],
    nameserver: foreignDNS,
    "proxy-server-nameserver": [
      "https://doh.pub/dns-query#DIRECT",
      "https://dns.alidns.com/dns-query#DIRECT"
    ],
    "direct-nameserver": chinaDNS,
    "direct-nameserver-follow-policy": true,

    // 【核心修改】：补全闭环 DNS 路由分流规则，彻底杜绝本地解析请求泄漏至境外
    rules: [
      "geosite:private => exec:direct-nameserver",
      ...BYPASS_DOMAINS.map(d => `domain-suffix:${d} => exec:direct-nameserver`),
      ...FORCE_PROXY_DOMAINS.map(d => `domain-suffix:${d} => exec:nameserver`),
      ...directGeoForChinaDNS.map(g => `${g} => exec:direct-nameserver`),
      "geosite:category-ai-!cn => exec:nameserver",
      "geosite:telegram => exec:nameserver",
      "geosite:gfw => exec:nameserver",
      "geosite:cn => exec:direct-nameserver",
      "geoip:cn => exec:direct-nameserver"
    ]
  };

  cfg.hosts = {
    ...(cfg.hosts || {}),
    "dns.alidns.com": ["223.5.5.5", "223.6.6.6"],
    "doh.pub": ["1.12.12.12", "120.53.53.53"],
    "services.googleapis.cn": ["services.googleapis.com"],
    "+.mcdn.bilivideo.com": ["0.0.0.0"],
    "+.mcdn.bilivideo.cn": ["0.0.0.0"]
  };
};

const applyProfile = (cfg) => {
  cfg.profile = {
    ...(cfg.profile || {}),
    "store-selected": true,
    "store-fake-ip": false
  };
};

const applyRuntime = (cfg) => {
  cfg.mode = "rule";
  cfg["log-level"] = "warning";
  cfg["allow-lan"] = false;
  cfg.ipv6 = false;
  cfg["unified-delay"] = true;
  cfg["tcp-concurrent"] = true;
  cfg["find-process-mode"] = "strict";
  cfg["global-client-fingerprint"] = "chrome";
  cfg["external-controller"] = cfg["external-controller"] || "127.0.0.1:9090";
};

// ====================
// 7. 主流程
// ====================
function main(config) {
  config = ensureConfigObject(config);

  const originalProxies = getOriginalProxies(config);
  const existingRules = Array.isArray(config.rules) ? config.rules : [];

  delete config["rule-providers"];
  config.rules = mergeRules(STATIC_RULES, pickDirectRules(existingRules));

  if (originalProxies.length) {
    makeProxyNamesUnique(originalProxies, RESERVED_PROXY_NAMES);

    const { normalProxies } = splitInfoAndNormalProxies(
      originalProxies,
      SETTINGS.FILTER_REGEX
    );

    // 【安全修改】：防止部分特殊订阅被完全过滤导致 baseProxies 为空引起的异常
    const baseProxies = normalProxies.length ? normalProxies : originalProxies;
    const allNames = uniq(baseProxies.map((p) => p.name));

    const {
      activeRegions,
      activeRegionNameSet,
      activeRegionMap,
      otherProxyNames
    } = classifyProxiesByRegion(baseProxies, REGIONS);

    const aiNames = buildAiProxyList(activeRegionNameSet, otherProxyNames);

    config["proxy-groups"] = buildProxyGroups({
      allNames,
      aiNames,
      activeRegionMap,
      activeRegionNameSet,
      otherProxyNames
    });

    config.proxies = originalProxies;
  }

  applyGeoData(config);
  applyRuntime(config);
  applySniffer(config);
  applyTun(config);
  applyDns(config);
  applyProfile(config);

  return config;
}
