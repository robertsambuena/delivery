'use strict'
const app = require('koa')()
const router = require('koa-router')()
const cors = require('koa-cors')
const logger = require('koa-logger')
const bodyParser = require('koa-bodyparser')
const route = require('./routes');

router.use('/', route.routes())

app
	.use(logger())
	.use(cors())
  .use(bodyParser())
	.use(router.routes())
	.use(router.allowedMethods())

app.listen(3000)
console.log('Server started at port 3000')
