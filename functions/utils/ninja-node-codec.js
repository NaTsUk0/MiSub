const NINJA_SCHEME = 'ninja://node/';

function encodeUtf8Base64Url(value) {
    const bytes = new TextEncoder().encode(value);
    let binary = '';
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function decodeUtf8Base64Url(value) {
    let normalized = String(value || '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    while (normalized.length % 4) normalized += '=';
    const binary = atob(normalized);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return new TextDecoder('utf-8').decode(bytes);
}

export function extractNinjaPassInfo(content) {
    if (typeof content !== 'string') return [];
    return content
        .replace(/\r\n/g, '\n')
        .split('\n')
        .filter((line) => /^#!PASS-INFO(?:\s|:|$)/.test(line));
}

export function encodeNinjaProxy(proxy, passInfo = []) {
    if (!proxy || String(proxy.type || '').toLowerCase() !== 'ninja') return null;
    const payload = encodeUtf8Base64Url(
        JSON.stringify({
            proxy,
            passInfo: Array.isArray(passInfo) ? passInfo : [],
        })
    );
    return `${NINJA_SCHEME}${payload}#${encodeURIComponent(proxy.name || 'Ninja')}`;
}

export function decodeNinjaProxy(nodeUrl) {
    if (typeof nodeUrl !== 'string' || !nodeUrl.toLowerCase().startsWith(NINJA_SCHEME)) {
        return null;
    }

    try {
        const hashIndex = nodeUrl.lastIndexOf('#');
        const payload = nodeUrl.slice(
            NINJA_SCHEME.length,
            hashIndex === -1 ? undefined : hashIndex
        );
        const decoded = JSON.parse(decodeUtf8Base64Url(payload));
        if (!decoded?.proxy || String(decoded.proxy.type || '').toLowerCase() !== 'ninja') {
            return null;
        }

        const proxy = { ...decoded.proxy };
        if (hashIndex !== -1) {
            try {
                proxy.name = decodeURIComponent(nodeUrl.slice(hashIndex + 1));
            } catch {
                proxy.name = nodeUrl.slice(hashIndex + 1);
            }
        }

        return {
            proxy,
            passInfo: Array.isArray(decoded.passInfo)
                ? decoded.passInfo.filter((line) => /^#!PASS-INFO(?:\s|:|$)/.test(line))
                : [],
        };
    } catch (error) {
        console.warn('[Ninja] Failed to decode internal node:', error?.message || error);
        return null;
    }
}

export function collectNinjaPassInfo(proxies) {
    const lines = [];
    const seen = new Set();
    for (const proxy of Array.isArray(proxies) ? proxies : []) {
        for (const line of Array.isArray(proxy?.__ninjaPassInfo) ? proxy.__ninjaPassInfo : []) {
            if (/^#!PASS-INFO(?:\s|:|$)/.test(line) && !seen.has(line)) {
                seen.add(line);
                lines.push(line);
            }
        }
    }
    return lines;
}

export function prependNinjaPassInfo(yamlText, passInfo) {
    const lines = Array.isArray(passInfo) ? passInfo.filter(Boolean) : [];
    if (lines.length === 0) return yamlText;
    return `${lines.join('\n')}\n${yamlText}`;
}
