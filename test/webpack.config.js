module.exports = {
  entry:"./test.spec.ts",
  output: { filename: "./bin/bundle.js" },
  devtool: "source-map",
  resolve: {extensions:["",".webpack.js","./web.js",".ts",".js"]},
  module: {
    loaders:    [{test: /\.ts$/, loader: "ts-loader" }],
    preLoaders: [{test: /\.js$/, loader: "source-map-loader" }]
  },
  externals:{ 
    
  }
}