const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

const VueLoaderPlugin = require('vue-loader/lib/plugin');

module.exports = env => {
  let isDevelopment = env && env.development;
  let config = {
    mode: isDevelopment ? 'development' : 'production',
    entry: {
      index: './src/index.js',
      // city: './src/city.js',
      // racing: './src/racing.js',
      travelagency: './src/travelagency.js',
      rehab: './src/rehab.js',
    },
    plugins: [
      new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
      new HtmlWebpackPlugin({
        title: 'Development',
      }),
      new VueLoaderPlugin(),
    ],
    output: {
      filename: '[name].bundle.js',
      path: path.resolve(__dirname, 'dist'),
    },
    module: {
      rules: [
        {
          test: /\.css$/i,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.vue$/,
          loader: 'vue-loader'
        },
      ],
    },
  };
  if (isDevelopment) {
    config.devtool = 'inline-source-map';
  }
  return config;
};