/* eslint-disable import/no-extraneous-dependencies */
const path = require('path');
const webpack = require('webpack');

const conf = {
  output: {
    libraryTarget: 'umd',
    filename: 'nuntius.js',
    path: './dist/',
  },
  devtool: 'cheap-module-source-maps',
  entry: './index.js',
  module: {
    loaders: [
      {
        test: /\.jsx?$/,
        exclude: path.join(__dirname, 'node_modules'),
        loader: 'babel',
      },
    ],
    preLoaders: [{
      test: /\.jsx?$/,
      exclude: path.join(__dirname, 'node_modules'),
      loader: 'eslint',
    }],
  },
  plugins: [
    new webpack.DefinePlugin({
      'process.env': {
        NODE_ENV: JSON.stringify(process.env.NODE_ENV),
      },
    }),
    new webpack.optimize.DedupePlugin(),
    new webpack.optimize.UglifyJsPlugin({
      output: {
        comments: false,
      },
      compress: {
        warnings: false,
        conditionals: true,
        unused: true,
        comparisons: true,
        sequences: true,
        dead_code: true,
        evaluate: true,
        if_return: true,
        join_vars: true,
      },
      sourceMap: false,
    }),
    new webpack.optimize.OccurenceOrderPlugin(),
    new webpack.optimize.AggressiveMergingPlugin(),
  ],
};

module.exports = conf;
