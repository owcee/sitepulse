const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);
  
  // Add crypto polyfill for web and ignore Node.js core modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    crypto: require.resolve('crypto-browserify'),
    stream: require.resolve('stream-browserify'),
    buffer: require.resolve('buffer'),
    vm: false,
    fs: false,
    net: false,
    tls: false,
    path: false,
    util: false,
  };

  // Add plugins for Buffer and process
  config.plugins.push(
    new (require('webpack')).ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    })
  );

  // Handle MIME type issues
  config.module.rules.push({
    test: /\.(png|jpe?g|gif|svg)$/,
    type: 'asset/resource',
  });

  // Ignore warnings for missing optional dependencies
  config.ignoreWarnings = [
    /Failed to parse source map/,
    /Could not find MIME for Buffer/,
    /Module not found.*@react-native-vector-icons/,
  ];

  return config;
};


