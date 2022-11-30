export type UserAgentBlacklistItemInMemory = {
    name: string;
    regexp: RegExp;
};

export type PriceOptimizationOrgConfigInMemory = {
    userAgentBlacklist: UserAgentBlacklistItemInMemory[];
};

export type UserAgentBlacklistItem = {
    name: string;
    regexp: string;
};

export type PriceOptimizationOrgConfig = {
    userAgentBlacklist: UserAgentBlacklistItem[];
};

export const defaultUserAgentBlacklist = [
    {
        name: 'Bot',
        regexp: '^.{0,100}?(?:(?:iPhone|Windows CE|Windows Phone|Android).{0,300}(?:(?:Bot|Yeti)-Mobile|YRSpider|BingPreview|bots?/\\d|(?:bot|spider)\\.html)|AdsBot-Google-Mobile.{0,200}iPhone)',
    },
    {
        name: 'Bot',
        regexp: '^.{0,100}?(?:DoCoMo|\\bMOT\\b|\\bLG\\b|Nokia|Samsung|SonyEricsson).{0,200}(?:(?:Bot|Yeti)-Mobile|bots?/\\d|(?:bot|crawler)\\.html|(?:jump|google|Wukong)bot|ichiro/mobile|/spider|YahooSeeker)',
    },
    {
        name: 'Bot',
        regexp: ' PTST/\\d+(?:\\.\\d+|)$',
    },
    {
        name: 'Bot',
        regexp: 'X11; Datanyze; Linux',
    },
    {
        name: 'Bot',
        regexp: 'Mozilla.{1,100}Mobile.{1,100}AspiegelBot',
    },
    {
        name: 'Bot',
        regexp: 'Mozilla.{0,200}AspiegelBot',
    },
    {
        name: 'Bot',
        regexp: '^.{0,100}(bot|BUbiNG|zao|borg|DBot|oegp|silk|Xenu|zeal|^NING|CCBot|crawl|htdig|lycos|slurp|teoma|voila|yahoo|Sogou|CiBra|Nutch|^Java/|^JNLP/|Daumoa|Daum|Genieo|ichiro|larbin|pompos|Scrapy|snappy|speedy|spider|msnbot|msrbot|vortex|^vortex|crawler|favicon|indexer|Riddler|scooter|scraper|scrubby|WhatWeb|WinHTTP|bingbot|BingPreview|openbot|gigabot|furlbot|polybot|seekbot|^voyager|archiver|Icarus6j|mogimogi|Netvibes|blitzbot|altavista|charlotte|findlinks|Retreiver|TLSProber|WordPress|SeznamBot|ProoXiBot|wsr\\-agent|Squrl Java|EtaoSpider|PaperLiBot|SputnikBot|A6\\-Indexer|netresearch|searchsight|baiduspider|YisouSpider|ICC\\-Crawler|http%20client|Python-urllib|dataparksearch|converacrawler|Screaming Frog|AppEngine-Google|YahooCacheSystem|fast\\-webcrawler|Sogou Pic Spider|semanticdiscovery|Innovazion Crawler|facebookexternalhit|Google.{0,200}/\\+/web/snippet|Google-HTTP-Java-Client|BlogBridge|IlTrovatore-Setaccio|InternetArchive|GomezAgent|WebThumbnail|heritrix|NewsGator|PagePeeker|Reaper|ZooShot|holmes|NL-Crawler|Pingdom|StatusCake|WhatsApp|masscan|Google Web Preview|Qwantify|Yeti|OgScrper)',
    },
];
