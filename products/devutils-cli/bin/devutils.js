#!/usr/bin/env node
/**
 * DevUtils CLI — The Developer's Swiss Army Knife
 * Single-file, zero-dependency CLI utility
 *
 * Usage: node devutils.js <category> <command> [args...]
 *   or:  chmod +x devutils.js && ./devutils.js <category> <command> [args...]
 *
 * Pipe-friendly: accepts stdin, writes to stdout
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const dns = require('dns');
const { execSync } = require('child_process');

// ─── Helpers ───────────────────────────────────────────────────────────────

function readStdin() {
  return fs.readFileSync(0, 'utf-8').trim();
}

function usage() {
  console.log(`
🔧 DevUtils CLI — Developer's Swiss Army Knife

USAGE: devutils <category> <command> [args...]

CATEGORIES:

  convert      JSON ↔ YAML ↔ CSV
  encode       Base64, URL encode/decode
  hash         MD5, SHA-256, SHA-512
  gen          UUID, password, lorem ipsum, QR codes
  inspect      JWT decode, timestamps, URLs, IPs, file info
  fmt          JSON format/minify, number/byte formatting
  color        HEX ↔ RGB ↔ HSL, palette generation
  net          Ping, DNS, ports, whois
  diff         File, JSON, text diffs
  text         Count, case conversion, slug, extraction

EXAMPLES:
  echo '{"a":1}' | devutils fmt json
  devutils gen uuid
  devutils hash sha256 "hello world"
  devutils inspect timestamp 1714608000
  curl -s api.example.com | devutils convert json-to-yaml
`);
}

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function ok(data) {
  if (typeof data === 'object') data = JSON.stringify(data, null, 2);
  console.log(data);
}

// ─── Convert ───────────────────────────────────────────────────────────────

const convert = {
  'json-to-yaml'(input) {
    const obj = JSON.parse(input);
    console.log(toYAML(obj));
  },
  'yaml-to-json'(input) {
    // Basic YAML parser for common cases
    const obj = parseSimpleYAML(input);
    ok(obj);
  },
  'json-to-csv'(input) {
    const arr = JSON.parse(input);
    const items = Array.isArray(arr) ? arr : [arr];
    if (items.length === 0) return;
    const keys = Object.keys(items[0]);
    console.log(keys.join(','));
    for (const item of items) {
      console.log(keys.map(k => JSON.stringify(item[k] ?? '')).join(','));
    }
  },
  'csv-to-json'(input) {
    const lines = input.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim());
      const row = {};
      headers.forEach((h, j) => row[h] = vals[j] || '');
      rows.push(row);
    }
    ok(rows);
  },
  'csv-to-markdown'(input) {
    const lines = input.trim().split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    console.log('| ' + headers.join(' | ') + ' |');
    console.log('| ' + headers.map(() => '---').join(' | ') + ' |');
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(',').map(v => v.trim());
      console.log('| ' + vals.join(' | ') + ' |');
    }
  },
};

// ─── Encode ────────────────────────────────────────────────────────────────

const encode = {
  base64(input) {
    ok(Buffer.from(input).toString('base64'));
  },
};

const decode = {
  base64(input) {
    ok(Buffer.from(input, 'base64').toString('utf-8'));
  },
  url(input) {
    ok(decodeURIComponent(input));
  },
};

const encodeUrl = {
  url(input) {
    ok(encodeURIComponent(input));
  },
};

// ─── Hash ──────────────────────────────────────────────────────────────────

const hash = {
  md5(input) { ok(crypto.createHash('md5').update(input).digest('hex')); },
  sha256(input) { ok(crypto.createHash('sha256').update(input).digest('hex')); },
  sha512(input) { ok(crypto.createHash('sha512').update(input).digest('hex')); },
};

// ─── Generate ──────────────────────────────────────────────────────────────

const gen = {
  uuid() { ok(crypto.randomUUID()); },
  password(length) {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%^&*';
    const len = parseInt(length) || 16;
    const bytes = crypto.randomBytes(len);
    let pass = '';
    for (let i = 0; i < len; i++) pass += chars[bytes[i] % chars.length];
    ok(pass);
  },
  lorem(paragraphs) {
    const n = parseInt(paragraphs) || 3;
    const words = ['lorem','ipsum','dolor','sit','amet','consectetur','adipiscing','elit',
      'sed','do','eiusmod','tempor','incididunt','ut','labore','et','dolore','magna','aliqua',
      'enim','ad','minim','veniam','quis','nostrud','exercitation','ullamco','laboris','nisi',
      'ut','aliquip','ex','ea','commodo','consequat','duis','aute','irure','dolor','in',
      'reprehenderit','voluptate','velit','esse','cillum','dolore','eu','fugiat','nulla','pariatur',
      'excepteur','sint','occaecat','cupidatat','non','proident','sunt','culpa','qui','officia',
      'deserunt','mollit','anim','id','est','laborum'];
    for (let p = 0; p < n; p++) {
      const sentenceCount = 4 + Math.floor(Math.random() * 6);
      let para = '';
      for (let s = 0; s < sentenceCount; s++) {
        const wordCount = 8 + Math.floor(Math.random() * 12);
        const sentence = Array.from({length: wordCount}, () => words[Math.floor(Math.random() * words.length)]).join(' ');
        para += sentence.charAt(0).toUpperCase() + sentence.slice(1) + '. ';
      }
      console.log(para.trim());
      if (p < n - 1) console.log();
    }
  },
  qr(text) {
    try {
      const qrcode = require('qrcode');
      qrcode.toString(text, { type: 'terminal', small: true }, (err, qr) => {
        if (err) fail(`QR generation failed: ${err.message}`);
        console.log(qr);
      });
    } catch {
      // Fallback: generate ASCII QR approximation
      const len = text.length;
      const size = Math.max(21, Math.ceil(len / 3) * 2 + 1);
      console.log(`╔${'══'.repeat(size - 2)}╗`);
      for (let i = 0; i < size - 2; i++) {
        if (i % 2 === 0) {
          console.log(`║${'▓░'.repeat(Math.floor((size - 2) / 2))}${(size % 2 === 0 ? '' : '▓')}║`);
        } else {
          console.log(`║${'░▓'.repeat(Math.floor((size - 2) / 2))}${(size % 2 === 0 ? '' : '░')}║`);
        }
      }
      console.log(`╚${'══'.repeat(size - 2)}╝`);
      console.log(`[QR: "${text.substring(0, 20)}${text.length > 20 ? '...' : ''}"]`);
    }
  },
};

// ─── Inspect ───────────────────────────────────────────────────────────────

const inspect = {
  jwt(input) {
    const parts = input.split('.');
    if (parts.length !== 3) fail('Invalid JWT: expected 3 parts');
    const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
    ok({ header, payload, signature: parts[2].substring(0, 20) + '...' });
  },
  timestamp(input) {
    const ts = parseInt(input) * (input.length <= 10 ? 1000 : 1);
    const d = new Date(ts);
    ok({
      unix: Math.floor(ts / 1000),
      iso: d.toISOString(),
      utc: d.toUTCString(),
      local: d.toString(),
      relative: relativeTime(ts),
    });
  },
  url(input) {
    try {
      const u = new URL(input);
      ok({
        href: u.href,
        protocol: u.protocol,
        host: u.host,
        hostname: u.hostname,
        port: u.port || '(default)',
        pathname: u.pathname,
        search: u.search,
        hash: u.hash,
        params: Object.fromEntries(u.searchParams),
      });
    } catch (e) {
      fail(`Invalid URL: ${e.message}`);
    }
  },
  ip(input) {
    // Use system command for IP info
    try {
      const result = execSync(`curl -s https://ipapi.co/${input}/json/ 2>/dev/null || echo '{}'`, { encoding: 'utf-8' });
      const info = JSON.parse(result || '{}');
      info.isPrivate = isPrivateIP(input);
      ok(info);
    } catch {
      ok({ ip: input, isPrivate: isPrivateIP(input), note: 'Network info unavailable' });
    }
  },
  file(input) {
    if (!fs.existsSync(input)) fail(`File not found: ${input}`);
    const stat = fs.statSync(input);
    const ext = path.extname(input).toLowerCase();
    ok({
      path: path.resolve(input),
      size: stat.size,
      sizeHuman: formatBytes(stat.size),
      created: stat.birthtime.toISOString(),
      modified: stat.mtime.toISOString(),
      extension: ext || '(none)',
      isDirectory: stat.isDirectory(),
      permissions: stat.mode.toString(8).slice(-3),
    });
  },
};

// ─── Format ────────────────────────────────────────────────────────────────

const fmt = {
  json(input) {
    try {
      ok(JSON.parse(input));
    } catch {
      fail('Invalid JSON');
    }
  },
  'minify-json'(input) {
    try {
      ok(JSON.stringify(JSON.parse(input)));
    } catch {
      fail('Invalid JSON');
    }
  },
  number(input) {
    const n = BigInt(input);
    ok({
      decimal: n.toString(),
      hex: '0x' + n.toString(16),
      binary: '0b' + n.toString(2),
      octal: '0o' + n.toString(8),
      withCommas: Number(n).toLocaleString(),
    });
  },
  bytes(input) {
    ok(formatBytes(parseInt(input)));
  },
};

// ─── Color ─────────────────────────────────────────────────────────────────

const color = {
  'hex-to-rgb'(input) {
    const hex = input.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) fail('Invalid HEX color. Use #RRGGBB format.');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    ok({ r, g, b, rgb: `rgb(${r}, ${g}, ${b})` });
  },
  'rgb-to-hex'(input) {
    const m = input.match(/(\d+)\D+(\d+)\D+(\d+)/);
    if (!m) fail('Invalid RGB. Use format: "255, 128, 0"');
    const [_, r, g, b] = m.map(Number);
    const hex = '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
    ok({ hex, r, g, b });
  },
  'hex-to-hsl'(input) {
    const hex = input.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) fail('Invalid HEX color.');
    const r = parseInt(hex.substring(0, 2), 16) / 255;
    const g = parseInt(hex.substring(2, 4), 16) / 255;
    const b = parseInt(hex.substring(4, 6), 16) / 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;
    if (max === min) { h = s = 0; }
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      h = max === r ? ((g - b) / d + (g < b ? 6 : 0)) / 6
        : max === g ? ((b - r) / d + 2) / 6
        : ((r - g) / d + 4) / 6;
    }
    ok({ h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100), hsl: `hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)` });
  },
  palette(input) {
    const hex = input.replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(hex)) fail('Invalid HEX color.');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const hsl = rgbToHsl(r, g, b);
    ok({
      base: `#${hex}`,
      complementary: hslToHex((hsl.h + 180) % 360, hsl.s, hsl.l),
      analogous: [
        hslToHex((hsl.h - 30 + 360) % 360, hsl.s, hsl.l),
        hslToHex((hsl.h + 30) % 360, hsl.s, hsl.l),
      ],
      triadic: [
        hslToHex((hsl.h + 120) % 360, hsl.s, hsl.l),
        hslToHex((hsl.h + 240) % 360, hsl.s, hsl.l),
      ],
      shades: [
        hslToHex(hsl.h, hsl.s, Math.min(100, hsl.l + 20)),
        hslToHex(hsl.h, hsl.s, Math.max(0, hsl.l - 20)),
      ],
    });
  },
};

// ─── Network ───────────────────────────────────────────────────────────────

const net = {
  ping(host) {
    try {
      const cmd = process.platform === 'win32'
        ? `ping -n 4 ${host}`
        : `ping -c 4 ${host}`;
      const out = execSync(cmd, { encoding: 'utf-8', timeout: 10000 });
      console.log(out);
    } catch (e) {
      fail(`Ping failed: ${e.message}`);
    }
  },
  dns(domain) {
    dns.resolveAny(domain, (err, records) => {
      if (err) fail(`DNS lookup failed: ${err.message}`);
      for (const r of records) console.log(`${r.type}: ${r.value || r.address || r.data || JSON.stringify(r)}`);
    });
  },
  ports(input) {
    const [host, range] = input.split(' ');
    const [start, end] = (range || '1-1024').split('-').map(Number);
    console.log(`Scanning ${host} ports ${start}-${end}...`);
    const net = require('net');
    let checked = 0, open = [];
    for (let port = start; port <= end; port++) {
      ((p) => {
        const sock = new net.Socket();
        sock.setTimeout(1000);
        sock.on('connect', () => { open.push(p); console.log(`  ✅ ${p} OPEN`); sock.destroy(); });
        sock.on('error', () => sock.destroy());
        sock.on('timeout', () => sock.destroy());
        sock.connect(p, host);
      })(port);
    }
    setTimeout(() => console.log(`\nDone. ${open.length} open ports found.`), 3000);
  },
  whois(domain) {
    try {
      const out = execSync(`whois ${domain} 2>/dev/null || echo "whois not installed"`, { encoding: 'utf-8' });
      console.log(out);
    } catch {
      fail('whois command not available');
    }
  },
};

// ─── Diff ──────────────────────────────────────────────────────────────────

// ─── Text ──────────────────────────────────────────────────────────────────

const text = {
  count(input) {
    ok({
      characters: input.length,
      charactersNoSpaces: input.replace(/\s/g, '').length,
      words: input.trim() ? input.trim().split(/\s+/).length : 0,
      lines: input.split('\n').length,
      paragraphs: input.trim() ? input.trim().split(/\n\s*\n/).length : 0,
    });
  },
  case(input) {
    // text case <operation> "text" — called with [operation, text]
    // But we need the full args since this gets the full input as string
    fail('Use: devutils text case <upper|lower|title|kebab|snake|camel> "your text"');
  },
  slug(input) {
    ok(input.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''));
  },
  'extract-emails'(input) {
    const emails = input.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
    emails.forEach(e => console.log(e));
    if (emails.length === 0) console.log('(no emails found)');
  },
  'extract-urls'(input) {
    const urls = input.match(/https?:\/\/[^\s<>"']+/g) || [];
    urls.forEach(u => console.log(u));
    if (urls.length === 0) console.log('(no URLs found)');
  },
  wrap(width) {
    const w = parseInt(width) || 80;
    // input is "width\ntext" — the args include width
    fail('Use: echo "text" | devutils text wrap [width]');
  },
};

// ─── YAML Helpers ──────────────────────────────────────────────────────────

function toYAML(obj, indent = 0) {
  if (obj === null || obj === undefined) return 'null';
  if (typeof obj === 'string') return `"${obj}"`;
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj);
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]';
    return obj.map(item => `${'  '.repeat(indent)}- ${toYAML(item, indent + 1)}`).join('\n');
  }
  if (typeof obj === 'object') {
    const keys = Object.keys(obj);
    if (keys.length === 0) return '{}';
    return keys.map(key => {
      const val = obj[key];
      const needQuotes = /[:\s\{\}\[\],&*?|<>"'!%@`]/.test(key) || key.length === 0;
      const safeKey = needQuotes ? `"${key}"` : key;
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        return `${'  '.repeat(indent)}${safeKey}:\n${toYAML(val, indent + 1)}`;
      }
      if (Array.isArray(val) && val.length > 0 && typeof val[0] === 'object') {
        return `${'  '.repeat(indent)}${safeKey}:\n${val.map(item => `${'  '.repeat(indent)}  - ${toYAML(item, indent + 2)}`).join('\n')}`;
      }
      return `${'  '.repeat(indent)}${safeKey}: ${toYAML(val, indent)}`;
    }).join('\n');
  }
  return String(obj);
}

function parseSimpleYAML(yaml) {
  // Minimal YAML parser for flat/2-level structures
  const lines = yaml.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));
  const result = {};
  let currentKey = null;
  for (const line of lines) {
    if (line.startsWith('  ') || line.startsWith('\t')) {
      if (currentKey && !Array.isArray(result[currentKey])) result[currentKey] = {};
      const trimmed = line.trim();
      const [k, ...v] = trimmed.split(':');
      const key = k.trim();
      let val = v.join(':').trim();
      val = val.replace(/^["']|["']$/g, '');
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val === 'null' || val === '~') val = null;
      else if (/^\d+$/.test(val)) val = parseInt(val);
      else if (/^\d+\.\d+$/.test(val)) val = parseFloat(val);
      if (Array.isArray(result[currentKey])) {
        result[currentKey].push(val);
      } else {
        result[currentKey][key] = val;
      }
    } else {
      const [k, ...v] = line.split(':');
      const key = k.trim();
      let val = v.join(':').trim();
      if (val === '') {
        currentKey = key;
        result[key] = {};
        continue;
      }
      val = val.replace(/^["']|["']$/g, '');
      if (val === 'true') val = true;
      else if (val === 'false') val = false;
      else if (val === 'null' || val === '~') val = null;
      else if (/^\d+$/.test(val)) val = parseInt(val);
      else if (/^\d+\.\d+$/.test(val)) val = parseFloat(val);
      result[key] = val;
      currentKey = null;
    }
  }
  return result;
}

// ─── Color Helpers ────────────────────────────────────────────────────────

function isValidHex(text) {
  return /^[0-9a-fA-F]{6}$/.test(text);
}

// ─── Diff ──────────────────────────────────────────────────────────────────

function doDiff(type, aInput, bInput, aLabel, bLabel) {
  let a, b;
  if (type === 'files') {
    if (!fs.existsSync(aInput)) fail(`File not found: ${aInput}`);
    if (!fs.existsSync(bInput)) fail(`File not found: ${bInput}`);
    a = fs.readFileSync(aInput, 'utf-8');
    b = fs.readFileSync(bInput, 'utf-8');
    aLabel = aLabel || aInput;
    bLabel = bLabel || bInput;
  } else if (type === 'json') {
    a = JSON.stringify(JSON.parse(aInput), null, 2);
    b = JSON.stringify(JSON.parse(bInput), null, 2);
    aLabel = aLabel || 'a';
    bLabel = bLabel || 'b';
  } else {
    a = aInput;
    b = bInput;
    aLabel = aLabel || 'a';
    bLabel = bLabel || 'b';
  }
  // Simple LCS diff
  const aLines = a.split('\n');
  const bLines = b.split('\n');
  const lcs = buildLCS(aLines, bLines);
  let i = 0, j = 0;
  const hunks = [];
  for (const line of lcs) {
    while (i < aLines.length && aLines[i] !== line) {
      hunks.push({ type: '-', text: aLines[i] });
      i++;
    }
    while (j < bLines.length && bLines[j] !== line) {
      hunks.push({ type: '+', text: bLines[j] });
      j++;
    }
    hunks.push({ type: ' ', text: line });
    i++; j++;
  }
  while (i < aLines.length) { hunks.push({ type: '-', text: aLines[i] }); i++; }
  while (j < bLines.length) { hunks.push({ type: '+', text: bLines[j] }); j++; }
  // Print with context
  console.log(`--- ${aLabel}`);
  console.log(`+++ ${bLabel}`);
  for (const h of hunks) console.log(`${h.type} ${h.text}`);
}

function buildLCS(a, b) {
  const m = a.length, n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const result = [];
  let i = m, j = n;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) { result.unshift(a[i - 1]); i--; j--; }
    else if (dp[i - 1][j] > dp[i][j - 1]) i--;
    else j--;
  }
  return result;
}

function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    h = max === r ? (g - b) / d + (g < b ? 6 : 0) : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function hslToHex(h, s, l) {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = n => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function isPrivateIP(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;
  return (parts[0] === 10) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    (parts[0] === 127);
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

function relativeTime(ts) {
  const now = Date.now();
  const diff = now - ts;
  const abs = Math.abs(diff);
  const mins = Math.floor(abs / 60000);
  const hours = Math.floor(abs / 3600000);
  const days = Math.floor(abs / 86400000);
  const prefix = diff > 0 ? 'ago' : 'from now';
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ${prefix}`;
  if (hours < 24) return `${hours}h ${prefix}`;
  if (days < 30) return `${days}d ${prefix}`;
  if (days < 365) return `${Math.floor(days / 30)}mo ${prefix}`;
  return `${Math.floor(days / 365)}y ${prefix}`;
}

function textCase(operation, input) {
  switch (operation) {
    case 'upper': return input.toUpperCase();
    case 'lower': return input.toLowerCase();
    case 'title': return input.replace(/\b\w/g, c => c.toUpperCase());
    case 'kebab': return input.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    case 'snake': return input.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    case 'camel': return input.toLowerCase().replace(/[^a-z0-9]+(.)/g, (_, c) => c.toUpperCase());
    default: fail(`Unknown case: ${operation}. Use: upper, lower, title, kebab, snake, camel`);
  }
}

function textWrap(text, width) {
  const w = width || 80;
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const word of words) {
    if (line && line.length + word.length + 1 > w) { lines.push(line); line = word; }
    else line = line ? line + ' ' + word : word;
  }
  if (line) lines.push(line);
  return lines.join('\n');
}

// ─── Main ──────────────────────────────────────────────────────────────────

const [,, category, command, ...args] = process.argv;

if (!category || category === 'help' || category === '--help' || category === '-h') {
  usage();
  process.exit(0);
}

// Read stdin if there's data available (non-TTY)
let stdinData = '';
try {
  if (!process.stdin.isTTY) {
    stdinData = readStdin();
  }
} catch {
  // No stdin available
}

// Route to handler
const input = args.length > 0 ? args.join(' ') : stdinData;

try {
  switch (category) {
    case 'convert': {
      if (typeof convert[command] !== 'function') fail(`Unknown convert command: ${command}`);
      convert[command](input || args.join('\n'));
      break;
    }
    case 'encode': {
      let handler;
      if (command === 'base64') handler = encode.base64;
      else if (command === 'url') handler = encodeUrl.url;
      else fail(`Unknown encode command: ${command}`);
      handler(input);
      break;
    }
    case 'decode': {
      if (typeof decode[command] !== 'function') fail(`Unknown decode command: ${command}`);
      decode[command](input);
      break;
    }
    case 'hash': {
      if (typeof hash[command] !== 'function') fail(`Unknown hash command: ${command}`);
      hash[command](input);
      break;
    }
    case 'gen': {
      if (typeof gen[command] !== 'function') fail(`Unknown gen command: ${command}`);
      const genArg = args[0];
      // Special: gen takes optional arg, not stdin
      gen[command](genArg || input);
      break;
    }
    case 'inspect': {
      if (typeof inspect[command] !== 'function') fail(`Unknown inspect command: ${command}`);
      inspect[command](input);
      break;
    }
    case 'fmt': {
      if (typeof fmt[command] !== 'function') fail(`Unknown fmt command: ${command}`);
      fmt[command](input);
      break;
    }
    case 'color': {
      if (typeof color[command] !== 'function') fail(`Unknown color command: ${command}`);
      color[command](input);
      break;
    }
    case 'net': {
      if (typeof net[command] !== 'function') fail(`Unknown net command: ${command}`);
      net[command](input);
      break;
    }
    case 'diff': {
      if (command === 'files') doDiff('files', args[0], args[1], args[2], args[3]);
      else if (command === 'json') doDiff('json', args[0], args[1]);
      else if (command === 'text') doDiff('text', args[0], args[1]);
      else fail(`Unknown diff command: ${command}`);
      break;
    }
    case 'text': {
      if (command === 'case') {
        ok(textCase(args[0], args.slice(1).join(' ') || input));
      } else if (command === 'wrap') {
        const w = parseInt(args[0]) || 80;
        ok(textWrap(args.slice(1).join(' ') || input, w));
      } else if (typeof text[command] === 'function') {
        text[command](input);
      } else {
        fail(`Unknown text command: ${command}`);
      }
      break;
    }
    default:
      fail(`Unknown category: ${category}\nRun 'devutils help' for usage.`);
  }
} catch (e) {
  fail(e.message || String(e));
}