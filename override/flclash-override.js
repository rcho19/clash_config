function main(config) {
  const unique = (items) => [...new Set((items || []).filter(Boolean))];
  const proxies = Array.isArray(config.proxies) ? config.proxies : [];
  const proxyNames = unique(proxies.map((proxy) => proxy && proxy.name));
  const proxyOnlyNames = proxyNames.filter((name) => name !== "DIRECT" && name !== "REJECT");
  const proxyProviders =
    config["proxy-providers"] && typeof config["proxy-providers"] === "object" && !Array.isArray(config["proxy-providers"])
      ? config["proxy-providers"]
      : {};
  const providerNames = Object.keys(proxyProviders);

  if (proxyOnlyNames.length === 0 && providerNames.length === 0) {
    return config;
  }

  const preferred =
    proxyOnlyNames.find((name) => name === "la9929-vless-reality") ||
    proxyOnlyNames.find((name) => /la9929|reality|vless|us|usa|美国|美西/i.test(name)) ||
    proxyOnlyNames[0] ||
    null;
  const orderedProxyNames = preferred ? [preferred, ...proxyOnlyNames.filter((name) => name !== preferred)] : [];
  const forcedProxySuffixes = [
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
    "cloudflare.com",
    "google.com",
    "googleapis.com",
    "gstatic.com",
    "ggpht.com",
    "googleusercontent.com",
    "googlevideo.com",
    "youtube.com",
    "youtu.be",
    "ytimg.com",
    "bing.com",
    "bingapis.com"
  ];
  const socialProxySuffixes = [
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
  const aiProxySuffixes = [
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
    "copilot.microsoft.com",
  ];
  const mediaProxySuffixes = [
    "googlevideo.com",
    "youtube.com",
    "youtu.be",
    "ytimg.com",
    "netflix.com",
    "nflxvideo.net",
    "disneyplus.com",
    "spotify.com"
  ];
  // 默认保留 UDP 443/QUIC；如 TCP 型节点导致 HTTP/3 反复失败，可改为 true。
  const STRICT_BLOCK_QUIC = false;
  const STRICT_BLOCK_STUN = true;
  const strictQuicRules = STRICT_BLOCK_QUIC ? ["AND,((NETWORK,UDP),(DST-PORT,443)),REJECT"] : [];
  const strictStunRules = STRICT_BLOCK_STUN
    ? [
        "DOMAIN-KEYWORD,stun,REJECT",
        "DOMAIN-KEYWORD,turn,REJECT",
        "AND,((NETWORK,UDP),(DST-PORT,3478)),REJECT",
        "AND,((NETWORK,UDP),(DST-PORT,5349)),REJECT",
        "AND,((NETWORK,UDP),(DST-PORT,19302)),REJECT"
      ]
    : [];

  config.mode = "rule";
  config["log-level"] = "warning";
  config["allow-lan"] = false;
  config.ipv6 = false;
  config["unified-delay"] = true;
  config["tcp-concurrent"] = true;
  config["find-process-mode"] = "strict";
  config["global-client-fingerprint"] = "chrome";
  config["external-controller"] = config["external-controller"] || "127.0.0.1:9090";

  config["geodata-mode"] = true;
  config["geo-auto-update"] = true;
  config["geo-update-interval"] = 24;
  config["geox-url"] = {
    ...(config["geox-url"] || {}),
    geoip: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geoip.dat",
    geosite: "https://testingcf.jsdelivr.net/gh/MetaCubeX/meta-rules-dat@release/geosite.dat"
  };

  config.profile = {
    ...(config.profile || {}),
    "store-selected": true,
    "store-fake-ip": false
  };

  config.sniffer = {
    ...(config.sniffer || {}),
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

  config.tun = {
    enable: true,
    stack: "system",
    "auto-route": true,
    "auto-detect-interface": true,
    "strict-route": true,
    "dns-hijack": ["any:53", "tcp://any:53"],
    "route-exclude-address": [
      "0.0.0.0/8",
      "10.0.0.0/8",
      "127.0.0.0/8",
      "169.254.0.0/16",
      "172.16.0.0/12",
      "192.168.0.0/16",
      "224.0.0.0/4",
      "255.255.255.255/32"
    ]
  };

  const chinaDNS = ["https://dns.alidns.com/dns-query#DIRECT", "https://doh.pub/dns-query#DIRECT"];
  const foreignDNS = ["https://1.1.1.1/dns-query#GLOBAL", "https://8.8.8.8/dns-query#GLOBAL"];
  const directGeoForChinaDNS = [
    "geosite:private",
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

  const nameserverPolicy = { "+.cn": chinaDNS };
  directGeoForChinaDNS.forEach((rule) => {
    nameserverPolicy[rule] = chinaDNS;
  });
  unique([...forcedProxySuffixes, ...socialProxySuffixes, ...aiProxySuffixes, ...mediaProxySuffixes]).forEach((domain) => {
    nameserverPolicy[`+.${domain}`] = foreignDNS;
  });
  ["geosite:category-ai-!cn", "geosite:telegram", "geosite:google", "geosite:gfw"].forEach((rule) => {
    nameserverPolicy[rule] = foreignDNS;
  });

  const existingDns = config.dns && typeof config.dns === "object" && !Array.isArray(config.dns) ? config.dns : {};
  const existingFakeIpFilter = Array.isArray(existingDns["fake-ip-filter"])
    ? existingDns["fake-ip-filter"].filter((item) => !/^\+\.stun/i.test(String(item)))
    : [];

  config.dns = {
    ...existingDns,
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
    "fake-ip-filter": [
      "+.cn",
      "*.lan",
      "*.local",
      "localhost.ptlogin2.qq.com",
      "+.msftconnecttest.com",
      "+.msftncsi.com",
      "time.*.com",
      "time.*.gov",
      "time.*.edu.cn",
      "time.*.apple.com",
      "time-ios.apple.com",
      "+.pool.ntp.org",
      ...directGeoForChinaDNS,
      ...existingFakeIpFilter
    ],
    "default-nameserver": ["223.5.5.5", "119.29.29.29"],
    nameserver: foreignDNS,
    "nameserver-policy": nameserverPolicy,
    "proxy-server-nameserver": ["https://doh.pub/dns-query#DIRECT", "https://dns.alidns.com/dns-query#DIRECT"],
    "direct-nameserver": chinaDNS,
    "direct-nameserver-follow-policy": true,
  };
  delete config.dns.rules;

  config.hosts = {
    ...(config.hosts || {}),
    "dns.alidns.com": ["223.5.5.5", "223.6.6.6"],
    "doh.pub": ["1.12.12.12", "120.53.53.53"],
    "services.googleapis.cn": ["services.googleapis.com"]
  };

  const globalGroup = {
    name: "GLOBAL",
    type: "select",
    proxies: orderedProxyNames,
    "include-all-providers": providerNames.length > 0
  };
  if (preferred) {
    globalGroup["default-selected"] = preferred;
  }

  const groups = [
    globalGroup,
    {
      name: "PROXY",
      type: "select",
      proxies: orderedProxyNames,
      "include-all-providers": providerNames.length > 0,
      url: "https://www.gstatic.com/generate_204",
      interval: 300
    },
    {
      name: "AI",
      type: "select",
      proxies: preferred ? [preferred, "PROXY"] : ["PROXY"],
      url: "https://www.gstatic.com/generate_204",
      interval: 300
    },
    {
      name: "MEDIA",
      type: "select",
      proxies: preferred ? ["PROXY", preferred] : ["PROXY"],
      url: "https://www.gstatic.com/generate_204",
      interval: 300
    }
  ];

  const managedGroupNames = new Set(groups.map((group) => group.name));
  const existingGroups = Array.isArray(config["proxy-groups"])
    ? config["proxy-groups"].filter((group) => !managedGroupNames.has(group.name))
    : [];

  config["proxy-groups"] = [...groups, ...existingGroups];

  config.rules = [
    "GEOSITE,category-ads-all,REJECT",
    "GEOSITE,private,DIRECT",
    "GEOIP,private,DIRECT,no-resolve",
    "DOMAIN-SUFFIX,local,DIRECT",
    "DOMAIN-SUFFIX,lan,DIRECT",
    "IP-CIDR,10.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,127.0.0.0/8,DIRECT,no-resolve",
    "IP-CIDR,172.16.0.0/12,DIRECT,no-resolve",
    "IP-CIDR,192.168.0.0/16,DIRECT,no-resolve",
    "IP-CIDR,169.254.0.0/16,DIRECT,no-resolve",

    ...strictQuicRules,
    ...strictStunRules,

    "GEOSITE,google-cn,DIRECT",
    "GEOSITE,synology,DIRECT",
    "DOMAIN-SUFFIX,sharepoint.com,DIRECT",
    "GEOSITE,microsoft@cn,DIRECT",
    "GEOSITE,category-game-platforms-download@cn,DIRECT",

    "GEOSITE,category-ai-!cn,AI",
    "DOMAIN-SUFFIX,openai.com,AI",
    "DOMAIN-SUFFIX,chatgpt.com,AI",
    "DOMAIN-SUFFIX,oaistatic.com,AI",
    "DOMAIN-SUFFIX,oaiusercontent.com,AI",
    "DOMAIN-SUFFIX,auth0.com,AI",
    "DOMAIN-SUFFIX,intercom.io,AI",
    "DOMAIN-SUFFIX,intercomcdn.com,AI",
    "DOMAIN-SUFFIX,anthropic.com,AI",
    "DOMAIN-SUFFIX,claude.ai,AI",
    "DOMAIN-SUFFIX,claudeusercontent.com,AI",
    "DOMAIN-SUFFIX,gemini.google.com,AI",
    "DOMAIN-SUFFIX,generativelanguage.googleapis.com,AI",
    "DOMAIN-SUFFIX,aistudio.google.com,AI",
    "DOMAIN-SUFFIX,ai.google.dev,AI",
    "DOMAIN-SUFFIX,makersuite.google.com,AI",
    "DOMAIN-SUFFIX,perplexity.ai,AI",
    "DOMAIN-SUFFIX,x.ai,AI",
    "DOMAIN-SUFFIX,grok.com,AI",
    "DOMAIN-SUFFIX,huggingface.co,AI",
    "DOMAIN-SUFFIX,hf.co,AI",
    "DOMAIN-SUFFIX,hf.space,AI",
    "DOMAIN-SUFFIX,replicate.com,AI",
    "DOMAIN-SUFFIX,cohere.com,AI",
    "DOMAIN-SUFFIX,mistral.ai,AI",
    "DOMAIN-SUFFIX,openrouter.ai,AI",
    "DOMAIN-SUFFIX,copilot.microsoft.com,AI",
    "DOMAIN-SUFFIX,googlevideo.com,MEDIA",
    "DOMAIN-SUFFIX,youtube.com,MEDIA",
    "DOMAIN-SUFFIX,youtu.be,MEDIA",
    "DOMAIN-SUFFIX,ytimg.com,MEDIA",
    "DOMAIN-SUFFIX,netflix.com,MEDIA",
    "DOMAIN-SUFFIX,nflxvideo.net,MEDIA",
    "DOMAIN-SUFFIX,disneyplus.com,MEDIA",
    "DOMAIN-SUFFIX,spotify.com,MEDIA",

    ...forcedProxySuffixes.map((domain) => `DOMAIN-SUFFIX,${domain},PROXY`),

    "GEOSITE,telegram,PROXY",
    "GEOSITE,google,PROXY",
    "GEOSITE,gfw,PROXY",
    ...socialProxySuffixes.map((domain) => `DOMAIN-SUFFIX,${domain},PROXY`),
    "DOMAIN-SUFFIX,github.com,PROXY",
    "DOMAIN-SUFFIX,githubusercontent.com,PROXY",
    "DOMAIN-SUFFIX,githubassets.com,PROXY",
    "DOMAIN-SUFFIX,gitlab.com,PROXY",
    "DOMAIN-SUFFIX,reddit.com,PROXY",
    "DOMAIN-SUFFIX,discord.com,PROXY",
    "DOMAIN-SUFFIX,discordapp.com,PROXY",
    "DOMAIN-SUFFIX,t.me,PROXY",

    "GEOSITE,cn,DIRECT",
    "GEOIP,CN,DIRECT,no-resolve",
    "MATCH,PROXY"
  ];

  return config;
}
