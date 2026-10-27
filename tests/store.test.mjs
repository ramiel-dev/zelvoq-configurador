import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Store} from '../src/shims/via-app-store.ts';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {Router, Route, Link, useLocation} from 'wouter';

test('wouter matches real panes on refresh with slash and preserves /configurador links', async () => {
  const {canonicalPath} = await import('../src/utils/router-path.ts');
  const Pane = () => React.createElement('span', null, useLocation()[0]);
  for (const route of [
    'test',
    'console',
    'settings',
    'debug',
    'errors',
  ]) {
    for (const suffix of ['', '/']) {
      const markup = renderToStaticMarkup(
        React.createElement(
          Router,
          {
            base: '/configurador',
            hook: ({base}) => [
              canonicalPath(`/configurador/${route}${suffix}`.slice(base.length)),
              () => {},
            ],
          },
          React.createElement(Route, {path: `/${route}`, component: Pane}),
          React.createElement(Link, {href: '/settings'}, 'Settings'),
        ),
      );
      assert.ok(markup.includes(`<span>/${route}</span>`), markup);
      assert.ok(markup.includes('href="/configurador/settings"'), markup);
    }
  }
});

test('isolates persisted state and keeps in-memory updates consistent when storage is full', () => {
  const values = new Map([
    ['landing-consent', 'yes'],
    ['via-app-store', '{"settings":{"theme":"old"}}'],
    ['zelvoq-configurator-store', '{broken'],
  ]);
  let quota = false;
  globalThis.localStorage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => {
      if (quota) throw new DOMException('Full', 'QuotaExceededError');
      values.set(key, value);
    },
    removeItem: (key) => values.delete(key),
    clear: () => assert.fail('must never clear shared origin storage'),
  };
  const defaults = {
    settings: {theme: 'zelvoq'},
    definitions: {},
    definitionIndex: {},
  };
  const store = new Store(defaults);
  assert.equal(store.get('settings').theme, 'zelvoq');
  store.set('settings', {theme: 'saved'});
  assert.equal(
    JSON.parse(values.get('zelvoq-configurator-store')).settings.theme,
    'saved',
  );
  assert.equal(defaults.settings.theme, 'zelvoq');
  quota = true;
  assert.doesNotThrow(() => store.set('definitions', {large: {}}));
  assert.deepEqual(store.get('definitions'), {large: {}});
  store.set('definitionIndex', {hash: 'new'});
  store.set('definitions', {});
  assert.equal(store.get('definitionIndex').hash, 'new');
  assert.deepEqual(store.get('definitions'), {});
  assert.equal(values.get('landing-consent'), 'yes');
  assert.equal(values.get('via-app-store'), '{"settings":{"theme":"old"}}');
  delete globalThis.localStorage;
});
