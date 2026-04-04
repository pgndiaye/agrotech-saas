'use strict';
const { defineConfig } = require('prisma/config');
require('dotenv').config({ path: require('path').resolve(__dirname, '.env') });

module.exports = defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
