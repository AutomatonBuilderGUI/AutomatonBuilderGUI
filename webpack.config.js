const path = require("path");
const webpack = require("webpack");
const { execSync } = require("child_process");

const hash = execSync("git rev-parse --short HEAD").toString().trim();

const time = new Date().toISOString();

module.exports = {
  entry: "./src/index.tsx",
  // Once this is ready for release, swap the commented and uncommented portions of the next two lines.
  mode: "development",
  devtool: "eval-cheap-module-source-map",
  // mode: "production",
  // devtool: false,
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        use: "ts-loader",
        exclude: /node-modules/,
      },
    ],
  },
  resolve: {
    extensions: [".tsx", ".ts", ".js"],
  },
  output: {
    filename: "bundle.js",
    path: path.resolve(__dirname, "dist"),
  },
  plugins: [
    new webpack.DefinePlugin({
      _HASH: JSON.stringify(hash),
      _TIME: JSON.stringify(time),
    }),
  ],
};
