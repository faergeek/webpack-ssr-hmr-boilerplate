import * as compression from 'compression';
import * as express from 'express';
import { readFileSync } from 'fs';
import * as path from 'path';
import renderToString from 'preact-render-to-string';
import invariant from 'tiny-invariant';

import { App } from './app';

function getEntryUrls(entry: string | string[] | undefined) {
  if (typeof entry === 'string') {
    return [entry];
  }

  if (Array.isArray(entry)) {
    return entry;
  }

  invariant(entry === undefined);
  return [];
}

const { main } = JSON.parse(
  readFileSync(path.resolve(__dirname, 'webpack-assets.json'), 'utf-8')
);

export const app = express().use(
  compression(),
  express.static(path.resolve('public')),
  express.static(path.resolve('build', 'public'), {
    maxAge: __DEV__ ? undefined : '1 year',
  }),
  (_req, res) => {
    res.set('Content-Type', 'text/html').send(
      `<!doctype html>${renderToString(
        <html lang="en">
          <meta charSet="utf-8" />
          <title>JS WebApp Template</title>
          <meta name="viewport" content="width=device-width,initial-scale=1" />
          {getEntryUrls(main.css).map(href => (
            <link key={href} rel="stylesheet" href={href} />
          ))}
          {getEntryUrls(main.js).map(src => (
            <script
              key={src}
              crossOrigin={
                process.env.NODE_ENV === 'production' ? undefined : 'anonymous'
              }
              defer
              src={src}
            />
          ))}
          <App />
        </html>
      )}`
    );
  }
);
