const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");
const Dotenv = require("dotenv-webpack");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = (env, argv) => {
  const isProd = argv.mode === "production";

  return {
    entry: path.resolve(__dirname, "src", "index.tsx"),
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: isProd ? "assets/[name].[contenthash].js" : "assets/[name].js",
      assetModuleFilename: "assets/[hash][ext][query]",
      clean: true,
      publicPath: "/"
    },
    devtool: isProd ? "source-map" : "eval-cheap-module-source-map",
    resolve: {
      extensions: [".ts", ".tsx", ".js"],
      alias: {
        "@": path.resolve(__dirname, "src")
      }
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: "ts-loader",
          exclude: /node_modules/
        },
        {
          test: /\.css$/,
          use: [isProd ? MiniCssExtractPlugin.loader : "style-loader", "css-loader"]
        },
        {
          test: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
          type: "asset/resource"
        }
      ]
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, "public", "index.html")
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, "public", "assets"),
            to: path.resolve(__dirname, "dist", "assets"),
            noErrorOnMissing: true
          }
        ]
      }),
      new Dotenv({
        path: path.resolve(__dirname, ".env"),
        safe: false,
        systemvars: true
      }),
      ...(isProd
        ? [
            new MiniCssExtractPlugin({
              filename: "assets/[name].[contenthash].css"
            })
          ]
        : [])
    ],
    devServer: {
      port: 5173,
      historyApiFallback: true,
      static: {
        directory: path.resolve(__dirname, "public")
      },
      client: {
        overlay: true
      }
    },
    performance: {
      hints: false
    }
  };
};

