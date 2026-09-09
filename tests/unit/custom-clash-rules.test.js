import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import {
    applyCustomClashRules,
    parseCustomClashRules,
} from '../../functions/modules/subscription/clash-rule-overrides.js';

describe('custom Clash rules override', () => {
    it('accepts plain lines and YAML fragments', () => {
        expect(
            parseCustomClashRules(`
# comment
DOMAIN-SUFFIX,gstatic.com,Proxy
- GEOIP,CN,DIRECT
MATCH,Proxy
`)
        ).toEqual(['DOMAIN-SUFFIX,gstatic.com,Proxy', 'GEOIP,CN,DIRECT', 'MATCH,Proxy']);

        expect(
            parseCustomClashRules(`
rules:
  - DOMAIN-SUFFIX,example.com,DIRECT
  - MATCH,Proxy
`)
        ).toEqual(['DOMAIN-SUFFIX,example.com,DIRECT', 'MATCH,Proxy']);
    });

    it('prepends custom rules, removes duplicates, and keeps one MATCH last', () => {
        const content = yaml.dump({
            proxies: [{ name: 'HK', type: 'ss', server: 'example.com', port: 443 }],
            'proxy-groups': [{ name: 'Proxy', type: 'select', proxies: ['HK'] }],
            rules: [
                'DOMAIN-SUFFIX,existing.example,Proxy',
                'DOMAIN-SUFFIX,gstatic.com,Proxy',
                'MATCH,Old',
            ],
        });

        const rendered = applyCustomClashRules(
            content,
            `DOMAIN-SUFFIX,gstatic.com,Proxy
GEOIP,CN,DIRECT
MATCH,Proxy`
        );
        const parsed = yaml.load(rendered);

        expect(parsed.rules).toEqual([
            'DOMAIN-SUFFIX,gstatic.com,Proxy',
            'GEOIP,CN,DIRECT',
            'DOMAIN-SUFFIX,existing.example,Proxy',
            'MATCH,Proxy',
        ]);
    });

    it('preserves Ninja PASS-INFO and proxy fields', () => {
        const content = `#!PASS-INFO v1;opaque-test-data
proxies:
  - name: Ninja HK
    type: ninja
    server: example.invalid
    port: 443
    pass: opaque-pass
proxy-groups:
  - name: Proxy
    type: select
    proxies: [Ninja HK]
rules: []
`;

        const rendered = applyCustomClashRules(content, 'MATCH,Proxy');
        const parsed = yaml.load(rendered);

        expect(rendered.split('\n')[0]).toBe('#!PASS-INFO v1;opaque-test-data');
        expect(parsed.proxies[0]).toMatchObject({
            name: 'Ninja HK',
            type: 'ninja',
            pass: 'opaque-pass',
        });
        expect(parsed.rules).toEqual(['MATCH,Proxy']);
    });

    it('returns the original profile when no custom rules are configured', () => {
        const content = 'rules:\n  - MATCH,DIRECT\n';
        expect(applyCustomClashRules(content, '')).toBe(content);
    });
});
