'use strict';

const routeDB = require('./routeDB');
const solver = require('./solver');
const services = {};

services.setCoordinates = function () {
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

  if (input.length > 25) {
    return this.body = {
      error: 'Max number of coordinates exceeded'
    }
  }

  input.forEach(function (coor) {
    if (!Array.isArray(coor)) {
      return err = 'Coordinate is not an array';
    }

    if (coor.length !== 2) {
      return err = 'Incomplete values for latitude & longitude';
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
  });

  if (err) {
    return this.body = {
      error: err
    }
  }

  const token = routeDB.saveQuery(input);
  solver(input, token);

  return this.body = {
    'token': token
  }
}

services.getCoordinates = async function (ctx, next) {
  const query = await routeDB.findQuery(this.params.token);

  if (!query) {
    return this.body = {
      status: 'failure',
      error: 'INVALID_TOKEN'
    }
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
  }

  return this.body;
}


module.exports = services;
