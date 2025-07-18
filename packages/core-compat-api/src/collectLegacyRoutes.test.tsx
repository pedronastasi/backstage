/*
 * Copyright 2023 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { FlatRoutes } from '@backstage/core-app-api';
import {
  CatalogEntityPage,
  CatalogIndexPage,
  EntityAboutCard,
  EntityLayout,
  EntitySwitch,
  isKind,
} from '@backstage/plugin-catalog';
import { Fragment } from 'react';
// TODO(rugvip): this should take into account that this is a test file, so these deps don't need to be in the dependencies
// eslint-disable-next-line @backstage/no-undeclared-imports
import { OpaqueFrontendPlugin } from '@internal/frontend';
import { Navigate, Route, Routes } from 'react-router-dom';

import { collectLegacyRoutes } from './collectLegacyRoutes';
import {
  createApiFactory,
  createApiRef,
  createPlugin,
  createRoutableExtension,
  createRouteRef,
  useApp,
} from '@backstage/core-plugin-api';
import { screen } from '@testing-library/react';
import { renderInTestApp } from '@backstage/frontend-test-utils';

const exampleApiRef = createApiRef<string>({
  id: 'plugin.example.service',
});
const examplePlugin1 = createPlugin({
  id: 'example-1',
  apis: [createApiFactory(exampleApiRef, 'example-api-1')],
});
const ExamplePage1 = examplePlugin1.provide(
  createRoutableExtension({
    name: 'ExamplePage1',
    mountPoint: createRouteRef({ id: 'example-1' }),
    component: () => Promise.resolve(() => <div>Example Page 1</div>),
  }),
);

const examplePlugin2 = createPlugin({
  id: 'example-2',
});
const ExamplePage2 = examplePlugin2.provide(
  createRoutableExtension({
    name: 'ExamplePage2',
    mountPoint: createRouteRef({ id: 'example-2' }),
    component: () => Promise.resolve(() => <div>Example Page 2</div>),
  }),
);

describe('collectLegacyRoutes', () => {
  it('should collect legacy routes', () => {
    const collected = collectLegacyRoutes(
      <FlatRoutes>
        <Route path="/example-1" element={<ExamplePage1 />} />
        <Route path="/other" element={<div />} />
        <Route path="/example-2" element={<ExamplePage2 />} />
        <Route path="/example-2" element={<ExamplePage2 />} />
        <Route path="/other" element={<div />} />
      </FlatRoutes>,
    );

    expect(
      collected.map(p => ({
        id: p.$$type === '@backstage/FrontendPlugin' ? p.id : p.pluginId,
        extensions: OpaqueFrontendPlugin.toInternal(p).extensions.map(e => ({
          id: e.id,
          attachTo: e.attachTo,
          disabled: e.disabled,
          defaultConfig: e.configSchema?.parse({}),
        })),
      })),
    ).toEqual([
      {
        id: 'example-1',
        extensions: [
          {
            id: 'page:example-1',
            attachTo: { id: 'app/routes', input: 'routes' },
            disabled: false,
            defaultConfig: {},
          },
          {
            id: 'api:example-1/plugin.example.service',
            attachTo: { id: 'root', input: 'apis' },
            disabled: false,
          },
        ],
      },
      {
        id: 'converted-orphan-routes',
        extensions: [
          {
            id: 'page:converted-orphan-routes',
            attachTo: { id: 'app/routes', input: 'routes' },
            disabled: false,
            defaultConfig: {},
          },
          {
            id: 'page:converted-orphan-routes/2',
            attachTo: { id: 'app/routes', input: 'routes' },
            disabled: false,
            defaultConfig: {},
          },
        ],
      },
      {
        id: 'example-2',
        extensions: [
          {
            id: 'page:example-2',
            attachTo: { id: 'app/routes', input: 'routes' },
            disabled: false,
            defaultConfig: {},
          },
          {
            id: 'page:example-2/1',
            attachTo: { id: 'app/routes', input: 'routes' },
            disabled: false,
            defaultConfig: {},
          },
        ],
      },
    ]);
  });

  it('supports recursion into children, including passing through fragments', () => {
    const collected = collectLegacyRoutes(
      <FlatRoutes>
        <Route path="/catalog" element={<CatalogIndexPage />} />
        <Route
          path="/catalog/:namespace/:kind/:name"
          element={<CatalogEntityPage />}
        >
          <EntitySwitch>
            <EntitySwitch.Case
              if={isKind('component')}
              children={
                <EntityLayout>
                  <EntityAboutCard variant="gridItem" />
                </EntityLayout>
              }
            />
            <EntitySwitch.Case>
              <EntityLayout>
                <EntityLayout.Route path="/" title="Overview">
                  <Fragment>
                    <Routes>
                      <Route path="/subthing">
                        <ExamplePage1 />
                      </Route>
                    </Routes>
                  </Fragment>
                </EntityLayout.Route>
              </EntityLayout>
            </EntitySwitch.Case>
          </EntitySwitch>
        </Route>
      </FlatRoutes>,
    );

    expect(
      collected.map(p => ({
        id: p.$$type === '@backstage/FrontendPlugin' ? p.id : p.pluginId,
        extensions: OpaqueFrontendPlugin.toInternal(p).extensions.map(e => ({
          id: e.id,
          attachTo: e.attachTo,
          disabled: e.disabled,
          defaultConfig: e.configSchema?.parse({}),
        })),
      })),
    ).toEqual([
      {
        id: 'catalog',
        extensions: [
          {
            id: 'page:catalog',
            attachTo: { id: 'app/routes', input: 'routes' },
            disabled: false,
            defaultConfig: {},
          },
          {
            id: 'page:catalog/1',
            attachTo: { id: 'app/routes', input: 'routes' },
            defaultConfig: {},
            disabled: false,
          },
          {
            id: 'routing-shim:catalog/2',
            attachTo: {
              id: 'page:catalog/1',
              input: 'childRoutingShims',
            },
            defaultConfig: undefined,
            disabled: false,
          },
          {
            id: 'routing-shim:catalog/3',
            attachTo: {
              id: 'routing-shim:catalog/2',
              input: 'childRoutingShims',
            },
            defaultConfig: undefined,
            disabled: false,
          },
          {
            id: 'routing-shim:catalog/4',
            attachTo: {
              id: 'routing-shim:catalog/3',
              input: 'childRoutingShims',
            },
            defaultConfig: undefined,
            disabled: false,
          },
          {
            id: 'api:catalog/plugin.catalog.service',
            attachTo: {
              id: 'root',
              input: 'apis',
            },
            defaultConfig: undefined,
            disabled: false,
          },
          {
            id: 'api:catalog/catalog-react.starred-entities',
            attachTo: {
              id: 'root',
              input: 'apis',
            },
            defaultConfig: undefined,
            disabled: false,
          },
          {
            id: 'api:catalog/plugin.catalog.entity-presentation',
            attachTo: {
              id: 'root',
              input: 'apis',
            },
            defaultConfig: undefined,
            disabled: false,
          },
        ],
      },
      {
        id: 'example-1',
        extensions: [
          {
            id: 'api:example-1/plugin.example.service',
            attachTo: { id: 'root', input: 'apis' },
            disabled: false,
          },
        ],
      },
    ]);
  });

  it('should make legacy APIs available', async () => {
    const plugin = createPlugin({
      id: 'test',
    });
    const routeRef = createRouteRef({ id: 'test' });
    const Page = plugin.provide(
      createRoutableExtension({
        name: 'Test',
        mountPoint: routeRef,
        component: () =>
          Promise.resolve(() => {
            const app = useApp();
            return (
              <div>
                plugins:{' '}
                {app
                  .getPlugins()
                  .map(p => p.getId())
                  .join(', ')}
              </div>
            );
          }),
      }),
    );

    const features = collectLegacyRoutes(
      <FlatRoutes>
        <Route path="/" element={<Page />} />
      </FlatRoutes>,
    );

    renderInTestApp(<div />, { features });

    await expect(
      screen.findByText('plugins: app, test'),
    ).resolves.toBeInTheDocument();
  });

  it('should throw if invalid Route has been detected', async () => {
    const plugin = createPlugin({
      id: 'test',
    });
    const routeRef = createRouteRef({ id: 'test' });
    const Page = plugin.provide(
      createRoutableExtension({
        name: 'Test',
        mountPoint: routeRef,
        component: async () => () => {
          const app = useApp();
          return <div>plugins: {app.getPlugins().map(p => p.getId())}</div>;
        },
      }),
    );

    expect(() =>
      collectLegacyRoutes(
        <FlatRoutes>
          <Route path="/" element={<Page />} />
          <Route path="/" element={<Page />} />
          <div />
        </FlatRoutes>,
      ),
    ).toThrow(
      /Invalid element inside FlatRoutes, expected Route but found div./,
    );
  });

  it('should throw if invalid element has been detected', async () => {
    const plugin = createPlugin({
      id: 'test',
    });
    const routeRef = createRouteRef({ id: 'test' });
    const Page = plugin.provide(
      createRoutableExtension({
        name: 'Test',
        mountPoint: routeRef,
        component: async () => () => {
          const app = useApp();
          return <div>plugins: {app.getPlugins().map(p => p.getId())}</div>;
        },
      }),
    );

    expect(() =>
      collectLegacyRoutes(
        <FlatRoutes>
          <Route path="/" element={<Page />} />a string
        </FlatRoutes>,
      ),
    ).toThrow(
      /Invalid element inside FlatRoutes, expected Route but found element of type string./,
    );
  });

  it('should throw if <Route /> has no path', async () => {
    const plugin = createPlugin({
      id: 'test',
    });
    const routeRef = createRouteRef({ id: 'test' });
    const Page = plugin.provide(
      createRoutableExtension({
        name: 'Test',
        mountPoint: routeRef,
        component: () =>
          Promise.resolve(() => {
            const app = useApp();
            return <div>plugins: {app.getPlugins().map(p => p.getId())}</div>;
          }),
      }),
    );

    expect(() =>
      collectLegacyRoutes(
        <FlatRoutes>
          <Route element={<Page />} />
        </FlatRoutes>,
      ),
    ).toThrow(/Route element inside FlatRoutes had no path prop value given/);
  });

  it('should throw if element cannot be converted', async () => {
    expect(() =>
      collectLegacyRoutes(
        <FlatRoutes>
          <Route element={<Navigate to="/somewhere" />} />
        </FlatRoutes>,
      ),
    ).toThrow(/Route element inside FlatRoutes had no path prop value given/);
  });
});
