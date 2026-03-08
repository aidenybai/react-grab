const BLOCKED_DOMAIN_PATTERNS = [
  // Adult content
  "pornhub",
  "xvideos",
  "xnxx",
  "xhamster",
  "redtube",
  "youporn",
  "tube8",
  "spankbang",
  "eporner",
  "xxxvideos",
  "porn",
  "xxx",
  "sex",
  "adult",
  "nsfw",
  "onlyfans",
  "fansly",
  "chaturbate",
  "livejasmin",
  "stripchat",
  "cam4",
  "bongacams",
  "myfreecams",
  "camsoda",
  "flirt4free",

  // Gambling
  "casino",
  "poker",
  "betting",
  "slots",
  "gambling",

  // Malware/Phishing common patterns
  "malware",
  "phishing",

  // Piracy
  "thepiratebay",
  "1337x",
  "rarbg",
  "torrent",

  // Self-referential (prevent infinite loops)
  "react-grab.com",
  "localhost",
  "127.0.0.1",
];

export const isBlockedDomain = (hostname: string): boolean => {
  const lowerHostname = hostname.toLowerCase();

  return BLOCKED_DOMAIN_PATTERNS.some((pattern) =>
    lowerHostname.includes(pattern.toLowerCase()),
  );
};
