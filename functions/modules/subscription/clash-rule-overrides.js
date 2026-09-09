import yaml from 'js-yaml';
import { extractNinjaPassInfo, prependNinjaPassInfo } from '../../utils/ninja-node-codec.js';

function normalizeRule(value) {
    if (typeof value !== 'string') return '';
    return value
        .trim()
        .replace(/^\s*-\s*/, '')
        .trim();
}

function isFinalRule(rule) {
    return /^(?:MATCH|FINAL)\s*,/i.test(rule);
}

function uniqueRules(rules) {
    const seen = new Set();
    return rules.filter((rule) => {
        if (!rule || seen.has(rule)) return false;
        seen.add(rule);
        return true;
    });
}

/**
 * Parse the settings textarea. It accepts either one Clash rule per line or a
 * small YAML fragment beginning with `rules:`.
 */
export function parseCustomClashRules(value) {
    if (Array.isArray(value)) {
        return uniqueRules(value.map(normalizeRule).filter(Boolean));
    }

    const raw = String(value || '').trim();
    if (!raw) return [];

    try {
        const yamlText = /^rules\s*:/im.test(raw)
            ? raw
            : `rules:\n${raw
                  .split(/\r?\n/)
                  .filter((line) => line.trim() && !line.trim().startsWith('#'))
                  .map((line) => `  - ${normalizeRule(line)}`)
                  .join('\n')}`;
        const parsed = yaml.load(yamlText);
        if (Array.isArray(parsed?.rules)) {
            return uniqueRules(parsed.rules.map(normalizeRule).filter(Boolean));
        }
    } catch {
        // Fall back to the permissive line parser below so one malformed line
        // does not discard all otherwise valid rules.
    }

    return uniqueRules(
        raw
            .split(/\r?\n/)
            .map((line) => line.trim())
            .filter((line) => line && !line.startsWith('#') && !/^rules\s*:\s*$/i.test(line))
            .map(normalizeRule)
            .filter(Boolean)
    );
}

/**
 * Prepend user rules to a generated Clash profile and keep exactly one final
 * MATCH/FINAL rule at the end. Ninja PASS-INFO comments are restored verbatim.
 */
export function applyCustomClashRules(content, customRulesValue) {
    const customRules = parseCustomClashRules(customRulesValue);
    if (customRules.length === 0 || typeof content !== 'string') return content;

    try {
        const passInfo = extractNinjaPassInfo(content);
        const config = yaml.load(content);
        if (!config || typeof config !== 'object' || Array.isArray(config)) return content;

        const originalRules = Array.isArray(config.rules)
            ? config.rules.map(normalizeRule).filter(Boolean)
            : [];
        const customBody = customRules.filter((rule) => !isFinalRule(rule));
        const originalBody = originalRules.filter((rule) => !isFinalRule(rule));
        const finalRule =
            [...customRules].reverse().find(isFinalRule) ||
            [...originalRules].reverse().find(isFinalRule) ||
            '';

        config.rules = uniqueRules([...customBody, ...originalBody]);
        if (finalRule) config.rules.push(finalRule);

        const rendered = yaml.dump(config, {
            indent: 2,
            lineWidth: -1,
            noRefs: true,
            quotingType: '"',
            forceQuotes: false,
        });
        return prependNinjaPassInfo(rendered, passInfo);
    } catch (error) {
        console.warn('[CustomClashRules] Failed to apply rules:', error?.message || error);
        return content;
    }
}
