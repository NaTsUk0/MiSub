import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import { parseNodeList } from '../../functions/modules/utils/node-parser.js';
import {
    generateBuiltinClashConfig,
    generateProxiesOnly,
} from '../../functions/modules/subscription/builtin-clash-generator.js';
import { renderClashFromIniTemplate } from '../../functions/modules/subscription/template-pipeline.js';
import { renderClashYamlProfileTemplate } from '../../functions/services/processor-service.js';

const PASS_INFO = '#!PASS-INFO v1;test-only-payload';
const NINJA_PROXY = {
    name: 'Ninja Hong Kong 01',
    type: 'ninja',
    server: 'example.invalid',
    port: 443,
    pass: 'opaque-pass-value',
    'pass-opts': {
        id: 'opaque-id',
        token: 'opaque-token',
    },
    tls: true,
    udp: true,
};

function buildSource() {
    return `${PASS_INFO}\n${yaml.dump({ proxies: [NINJA_PROXY] }, { lineWidth: -1 })}`;
}

describe('Ninja subscription passthrough', () => {
    it('keeps Ninja proxies in the internal node pipeline', () => {
        const nodes = parseNodeList(buildSource());

        expect(nodes).toHaveLength(1);
        expect(nodes[0].protocol).toBe('ninja');
        expect(nodes[0].name).toBe(NINJA_PROXY.name);
        expect(nodes[0].url).toMatch(/^ninja:\/\/node\//);
    });

    it('restores the exact proxy object and PASS-INFO in Clash output', () => {
        const nodes = parseNodeList(buildSource());
        const rendered = generateBuiltinClashConfig(nodes.map((node) => node.url).join('\n'), {
            ruleLevel: 'base',
            addFlagEmoji: false,
        });
        const parsed = yaml.load(rendered);

        expect(rendered.split('\n')[0]).toBe(PASS_INFO);
        expect(parsed.proxies).toHaveLength(1);
        expect(parsed.proxies[0]).toEqual(NINJA_PROXY);
        expect(rendered).not.toContain('__ninjaPassInfo');
        expect(rendered).not.toContain('__isNinjaProxy');
    });

    it('preserves PASS-INFO in proxies-only output', () => {
        const nodes = parseNodeList(buildSource());
        const rendered = generateProxiesOnly(nodes.map((node) => node.url).join('\n'));

        expect(rendered.split('\n')[0]).toBe(PASS_INFO);
        expect(yaml.load(rendered).proxies[0]).toEqual(NINJA_PROXY);
    });

    it('preserves Ninja data when applying an INI group and rule template', () => {
        const nodes = parseNodeList(buildSource());
        const rendered = renderClashFromIniTemplate(
            `
[Proxy Group]
Ninja Select = select, Ninja Hong Kong 01, DIRECT

[Rule]
MATCH,Ninja Select
`,
            { nodeList: nodes.map((node) => node.url).join('\n'), addFlagEmoji: false }
        );

        expect(rendered.split('\n')[0]).toBe(PASS_INFO);
        expect(yaml.load(rendered).proxies[0]).toEqual(NINJA_PROXY);
    });

    it('preserves Ninja data when injecting nodes into a Clash YAML profile', () => {
        const nodes = parseNodeList(buildSource());
        const rendered = renderClashYamlProfileTemplate(
            `
proxy-groups:
  - name: Ninja Select
    type: select
    proxies: [Ninja Hong Kong 01, DIRECT]
rules:
  - MATCH,Ninja Select
`,
            nodes.map((node) => node.url).join('\n'),
            { addFlagEmoji: false }
        );

        expect(rendered.split('\n')[0]).toBe(PASS_INFO);
        expect(yaml.load(rendered).proxies[0]).toEqual(NINJA_PROXY);
    });
});

describe('Ninja User-Agent field', () => {
    it('accepts arbitrary text and offers the Ninja UA preset', () => {
        const component = fs.readFileSync(
            path.resolve('src/components/modals/SubscriptionEditModal/AdvancedOptions.vue'),
            'utf8'
        );

        expect(component).toContain('v-model="editingSubscription.customUserAgent"');
        expect(component).toContain('type="text"');
        expect(component).toContain('list="sub-edit-ua-presets"');
        expect(component).toContain('value="clash-ninja/v2.4.0"');
    });
});
