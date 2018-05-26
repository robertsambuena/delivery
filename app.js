'use strict'
const app = require('koa')();
const router = require('koa-router')();
const cors = require('koa-cors');
const logger = require('koa-logger');
const bodyParser = require('koa-bodyparser');
const services = require('./services');
const routeDB = require('./routeDB');

/* app url routes */
router.post('SetCoordinates', '/route', services.setCoordinates);
router.get('GetCoordinates', '/route/:token', services.getCoordinates);

app
	.use(logger())
	.use(cors())
	.use(bodyParser())
	.use(router.routes())
	.use(router.allowedMethods());

/* initiate DB connection */
routeDB.connectWithRetry();

const server = app.listen(3000).on('error', err => {
  console.error(err);
});

console.log('Server started at port 3000');

module.exports = server;
