const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const { CleanWebpackPlugin } = require('clean-webpack-plugin');

module.exports = env => {
  let isDevelopment = env && env.development;
  let config = {
    mode: isDevelopment ? 'development' : 'production',
    entry: {
      // city: './src/city.js',
      // racing: './src/racing.js',
      travelagency: './src/travelagency.js',
    },
    plugins: [
      new CleanWebpackPlugin({ cleanStaleWebpackAssets: false }),
      new HtmlWebpackPlugin({
        title: 'Development',
      }),
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
      ],
    },
  };
  if (isDevelopment) {
    config.devtool = 'inline-source-map';
  }
  return config;
};