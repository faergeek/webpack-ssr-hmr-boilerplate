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
    mode: dev ? 'development' : 'production',
    watch: dev,
    devtool: dev && !node ? 'inline-source-map' : 'source-map',
    target: node ? 'node' : 'web',
    stats: dev ? 'none' : undefined,
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
    externals: node
      ? nodeExternals({ allowlist: [/^webpack\/hot/] })
      : undefined,
    module: {
      rules: [
        {
          test: /\.js$/,
          use: 'source-map-loader',
        },
        {
          test: /\.js$/,
          include: [path.resolve('src')],
          use: {
            loader: 'babel-loader',
            options: {
              presets: [
                [
                  '@babel/preset-env',
                  {
                    corejs: 3,
                    loose: true,
                    modules: false,
                    useBuiltIns: 'usage',
                    targets: node ? { node: 'current' } : undefined,
                  },
                ],
              ],
            },
          },
        },
        {
          test: /\.css$/,
          use: node
            ? 'null-loader'
            : [
                MiniCssExtractPlugin.loader,
                { loader: 'css-loader', options: { importLoaders: 1 } },
                'postcss-loader',
              ],
        },
      ],
    },
    plugins: [
      dev && new FriendlyErrorsWebpackPlugin(),
      dev && node && new webpack.HotModuleReplacementPlugin(),
      dev &&
        node &&
        new RunScriptWebpackPlugin({
          name: 'main.js',
          nodeArgs: ['--inspect'],
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
    },
  };
}

module.exports = ({ dev = false } = {}) => [
  makeConfig({ dev, node: false }),
  makeConfig({ dev, node: true }),
];
