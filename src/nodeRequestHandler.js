import { createRouter } from '@curi/router';
import { createReusable } from '@hickory/in-memory';
import * as assert from 'assert';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as React from 'react';
import { renderToString } from 'react-dom/server';

import { routes } from './routes';
import { App } from './app';

function getEntryUrls(entry) {
  if (typeof entry === 'string') {
    return [entry];
  }

  if (Array.isArray(entry)) {
    return entry;
  }

  assert(entry === undefined);
}

const getAssetsManifest = (() => {
  let promise;

  return () => {
    if (!promise) {
      promise = fs.promises
        .readFile(path.resolve('build', 'webpack-assets.json'), 'utf-8')
        .then(content => JSON.parse(`${content}`));
    }

    return promise;
  };
})();

const reusable = createReusable();

export const app = express().use(
  express.static(path.resolve('build', 'public'), { maxAge: '1 year' }),
  async (req, res, next) => {
    const router = createRouter(reusable, routes, {
      history: { location: { url: req.originalUrl } },
    });

    try {
      const webpackAssets = await getAssetsManifest();

      router.once(({ response }) => {
        res
          .status((response.meta && response.meta.status) || 200)
          .set('Content-Type', 'text/html')
          .end(
            `<!doctype html>${renderToString(
              <>
                <meta charSet="utf-8" />
                <meta httpEquiv="x-ua-compatible" content="ie=edge" />

                <meta
                  name="viewport"
                  content="width=device-width,initial-scale=1"
                />

                <title>Webpack SSR HMR Boilerplate</title>

                {getEntryUrls(webpackAssets.main.css).map(href => (
                  <link key={href} rel="stylesheet" href={href} />
                ))}

                {getEntryUrls(webpackAssets.main.js).map(src => (
                  <script
                    key={src}
                    crossOrigin={
                      process.env.NODE_ENV === 'production'
                        ? undefined
                        : 'anonymous'
                    }
                    defer
                    src={src}
                  />
                ))}

                <div id="root">
                  <App router={router} />
                </div>
              </>
            )}`
          );
      });
    } catch (err) {
      next(err);
    }
  }
);
