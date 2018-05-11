'use strict';

const router = require('koa-router')();
const routeDB = require('./routeDB');
const solver = require('./solver');

router.post('/route', function (next) {
  const input = this.request.body;
  let err;

  if (!Array.isArray(input)) {
    return this.body = {
      error: 'Invalid input'
    }
  }

  if (input.length < 2) {
    return this.body = {
      error: 'Destination should be provided'
    }
  }

  input.forEach(function (coor) {
    if (!Array.isArray(coor)) {
      err = 'Coordinate is not an array';
    }

    if (coor.length !== 2) {
      err = 'Incomplete values for latitude & longitude';
    }

    let lat = Number(coor[0]);
    let long = Number(coor[1]);

    if (!(lat === +lat && lat !== (lat|0))) {
      err = 'Invalid latitude float value';
    }

    if (!(long === +long && long !== (long|0))) {
      err = 'Invalid longitude float value';
    }

    return !err;
  })

  if (err) {
    return this.body = {
      error: err
    }
  }

  const token = routeDB.saveQuery(input);
  solver(input, token);

  this.body = {
    'token': token
  }
});

router.get('/route/:token', async function (next) {
  const query = await routeDB.findQuery(this.params.token);

  if (!query) {
    this.body = {
      status: 'failure',
      error: 'INVALID_TOKEN'
    }
    return;
  }

  if (query.status === 'in progress') {
    this.body = {
      status: 'in progress'
    }
  } else if (query.status === 'success') {
    this.body = {
      status: 'success',
      path: query.input,
      total_distance: query.value.distance,
      total_time: query.value.duration
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
