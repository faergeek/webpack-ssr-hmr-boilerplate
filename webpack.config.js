const ReactRefreshWebpackPlugin = require('@pmmmwh/react-refresh-webpack-plugin');
const AssetsPlugin = require('assets-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const { RunScriptWebpackPlugin } = require('run-script-webpack-plugin');
const webpack = require('webpack');
const nodeExternals = require('webpack-node-externals');
const { WebpackPluginServe } = require('webpack-plugin-serve');

const BUILD_ROOT = path.resolve('build');
const PUBLIC_ROOT = path.resolve(BUILD_ROOT, 'public');

function makeConfig({ dev, node }) {
  return {
    name: node ? 'node' : 'browser',
    target: node ? 'node' : 'web',
    stats: dev ? 'none' : 'errors-warnings',
    devtool: dev ? 'cheap-module-source-map' : 'source-map',
    watch: dev,
    externals: node
      ? nodeExternals({ allowlist: [/^webpack\/hot/] })
      : undefined,
    entry: {
      main: (node
        ? [
            'source-map-support/register',
            dev && 'webpack/hot/signal',
            'dotenv-flow/config',
            './src/node',
          ]
        : [dev && 'webpack-plugin-serve/client', './src/browser']
      ).filter(Boolean),
    },
    output: {
      chunkFilename: `[name]${dev || node ? '' : '.[contenthash]'}.js`,
      crossOriginLoading: dev ? 'anonymous' : undefined,
      devtoolModuleFilenameTemplate: node
        ? path.relative(BUILD_ROOT, '[resource-path]')
        : undefined,
      filename: `[name]${dev || node ? '' : '.[contenthash]'}.js`,
      libraryTarget: node ? 'commonjs' : undefined,
      path: node ? BUILD_ROOT : PUBLIC_ROOT,
      publicPath: dev ? 'http://localhost:8081/' : '/',
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          include: path.resolve('src'),
          loader: 'babel-loader',
          options: {
            envName: dev ? 'development' : 'production',
          },
        },
        {
          test: /\.css$/,
          use: (node ? [] : [MiniCssExtractPlugin.loader]).concat([
            {
              loader: 'css-loader',
              options: {
                importLoaders: 2,
                modules: {
                  auto: true,
                  exportOnlyLocals: node,
                  exportLocalsConvention: 'dashesOnly',
                  localIdentName: dev
                    ? '[local]@[1]#[contenthash:base64:5]'
                    : undefined,
                  localIdentRegExp: /\/([^/]*)\.module\.\w+$/i,
                },
              },
            },
            'postcss-loader',
          ]),
        },
        { test: /\.(css|js)$/, use: 'source-map-loader' },
        { test: /\.(svg|png|gif|jpe?g|eot|ttf|woff2?)$/, type: 'asset' },
      ],
    },
    plugins: [
      dev && new FriendlyErrorsWebpackPlugin(),
      dev && node && new webpack.HotModuleReplacementPlugin(),
      dev &&
        !node &&
        new ReactRefreshWebpackPlugin({ overlay: { sockIntegration: 'wps' } }),
      dev &&
        node &&
        new RunScriptWebpackPlugin({
          name: 'main.js',
          nodeArgs: ['--inspect=9229'],
          signal: true,
        }),
      dev &&
        !node &&
        new WebpackPluginServe({
          client: { retry: true },
          hmr: 'refresh-on-failure',
          log: { level: 'error' },
          port: 8081,
          static: [PUBLIC_ROOT],
          waitForBuild: true,
          middleware: (app, builtins) =>
            builtins.headers({ 'Access-Control-Allow-Origin': '*' }),
        }),
      !node &&
        new AssetsPlugin({
          entrypoints: true,
          includeAuxiliaryAssets: true,
          path: BUILD_ROOT,
          prettyPrint: dev,
        }),
      !node &&
        new MiniCssExtractPlugin({
          filename: dev ? '[name].css' : '[name].[contenthash].css',
        }),
    ].filter(Boolean),
    optimization: {
      minimizer: ['...', new CssMinimizerPlugin()],
      runtimeChunk: 'single',
      splitChunks: {
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/](?!webpack[\\/]hot[\\/]).*\.js$/,
            name: 'vendors',
            chunks: 'initial',
            enforce: true,
          },
          css: {
            test: /\.css$/,
            name: 'main',
            chunks: 'all',
            enforce: true,
          },
        },
      },
    },
  };
}

module.exports = (env, argv) => {
  return argv.mode === 'development'
    ? [
        makeConfig({ dev: true, node: false }),
        makeConfig({ dev: true, node: true }),
      ]
    : argv.mode === 'production'
    ? [
        makeConfig({ dev: false, node: false }),
        makeConfig({ dev: false, node: true }),
      ]
    : [
        makeConfig({ dev: true, node: false }),
        makeConfig({ dev: true, node: true }),
        makeConfig({ dev: false, node: false }),
        makeConfig({ dev: false, node: true }),
      ];
};
