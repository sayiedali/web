/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Exclude ws from bundling on server side
    if (isServer) {
      config.externals.push({
        'utf-8-validate': 'commonjs utf-8-validate',
        'bufferutil': 'commonjs bufferutil',
      });
    }

    // Your existing mp3 rule
    config.module.rules.push({
      test: /\.(mp3)$/,
      use: {
        loader: "file-loader",
        options: {
          publicPath: "/_audio/",
          outputPath: "static/_audio/",
          name: "[name].[ext]",
          esModule: false,
        },
      },
    });

    return config;
  },
};

module.exports = nextConfig;