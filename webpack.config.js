const AssetsPlugin = require('assets-webpack-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const FriendlyErrorsWebpackPlugin = require('friendly-errors-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const path = require('path');
const webpack = require('webpack');

const packageJson = require('./package.json');

const BUILD_ROOT = path.resolve('build');
const PUBLIC_ROOT = path.resolve(BUILD_ROOT, 'public', '_assets');

function makeConfig({ dev, node }) {
  const stats = dev ? 'none' : undefined;

  return {
    name: node ? 'node' : 'browser',
    mode: dev ? 'development' : 'production',
    watch: dev && node,
    devtool: dev && !node ? 'inline-source-map' : 'source-map',
    target: node ? 'node' : 'web',
    stats,
    entry: {
      main: (node
        ? [
            'source-map-support/register',
            dev && 'webpack/hot/poll?1000',
            'dotenv-flow/config',
            './src/node',
          ]
        : ['./src/browser']
      ).filter(Boolean),
    },
    output: {
      chunkFilename: `[name]${dev || node ? '' : '.[contenthash]'}.js`,
      crossOriginLoading: dev ? 'anonymous' : undefined,
      devtoolModuleFilenameTemplate: node
        ? path.relative(BUILD_ROOT, '[resource-path]')
        : undefined,
      filename: `[name]${dev || node ? '' : '.[contenthash]'}.js`,
      path: node ? BUILD_ROOT : PUBLIC_ROOT,
      publicPath: dev ? 'http://localhost:8081/' : '/',
    },
    devServer:
      dev && !node
        ? {
            contentBase: false,
            headers: { 'Access-Control-Allow-Origin': '*' },
            hot: true,
            injectClient: true,
            port: 8081,
            stats,
          }
        : undefined,
    externals: node
      ? ({ request }, cb) => {
          if (
            [
              ...Object.keys(packageJson.dependencies),
              ...Object.keys(packageJson.devDependencies),
            ].some(packageName => request.startsWith(packageName)) &&
            !request.startsWith('webpack/hot')
          ) {
            cb(null, `commonjs ${request}`);
          } else {
            cb();
          }
        }
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
      dev && new FriendlyErrorsWebpackPlugin({ clearConsole: false }),
      dev && new webpack.HotModuleReplacementPlugin(),
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
