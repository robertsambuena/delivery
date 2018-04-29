'use strict';

const router = require('koa-router')();
const routeDB = require('./routeDB');
const directions = require('./directions');

router.post('/route', function (next) {
  const input = this.request.body;

  if (!Array.isArray(input)) {
    this.body = {
      error: 'Invalid input'
    }

    return;
  }

  this.body = {
		'token': routeDB.saveQuery(input)
	}
});

router.get('/route/:token', async function (next) {
  const query = await routeDB.findQuery(this.params.token);

  if (typeof query === 'undefined') {
    this.body = {
      status: 'failure',
      error: 'INVALID_TOKEN'
    }
    return;
  }

  if (query.status === 'in progress') {
    directions(query.input, query.token);
    this.body = {
      status: 'in progress'
    }
  } else if (query.status === 'success') {
    this.body = {
      status: 'success',
      path: query.input,
      total_distance: query.value.distance.value,
      total_time: query.value.duration.value
    }
  } else {
    this.body = {
      status: 'failure',
      error: query.value && query.value.message || 'undefined error'
    }

    return;
  }
});

module.exports = router;
