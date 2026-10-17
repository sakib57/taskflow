const { NxAppWebpackPlugin } = require('@nx/webpack/app-plugin');
const { join, resolve } = require('path');

module.exports = {
  output: {
    path: join(__dirname, '../../dist/apps/auth-service'),
    clean: true,
    ...(process.env.NODE_ENV !== 'production' && {
      devtoolModuleFilenameTemplate: '[absolute-resource-path]',
    }),
  },
  resolve: {
    alias: {
      'class-transformer/storage': resolve(
        __dirname,
        '../../node_modules/class-transformer/cjs/storage.js',
      ),
    },
  },
  plugins: [
    new NxAppWebpackPlugin({
      target: 'node',
      compiler: 'tsc',
      main: './src/main.ts',
      tsConfig: './tsconfig.app.json',
      assets: ['./src/assets'],
      optimization: false,
      outputHashing: 'none',
      generatePackageJson: false,
      sourceMap: true,
      externalDependencies: [
        '@nestjs/microservices',
        '@nestjs/websockets',
        '@nestjs/platform-socket.io',
        'bcrypt',
        'pg-native',
        'ioredis',
        'amqp-connection-manager',
        'amqplib',
        'kafkajs',
        'mqtt',
        'nats',
        '@grpc/grpc-js',
        '@grpc/proto-loader',
        'cache-manager',
      ],
    }),
  ],
};
