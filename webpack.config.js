const path = require("path");
const webpack = require("webpack");
const { execSync } = require("child_process");

const hash = execSync("git rev-parse --short HEAD").toString().trim();
const time = new Date().toISOString();
const user = execSync("git log -1 --pretty=format:'%ae'").toString().trim();
const email = execSync("git log -1 --pretty=format:'%an'").toString().trim();
const message = execSync("git log -1 --pretty=%B").toString().trim();
// construct git url to commit based on the remote origin and commit hash
const git = execSync("git config --get remote.origin.url").toString().trim();
const giturl =
  "https://" +
  git
    .substring(git.indexOf("@") + 1)
    .replace(":", "/")
    .replace(".git", "") +
  "/commit/" +
  hash;

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
      _URL: JSON.stringify(giturl),
      _GIT_NAME: JSON.stringify(user),
      _GIT_EMAIL: JSON.stringify(email),
      _GIT_MESSAGE: JSON.stringify(message),
    }),
  ],
};
