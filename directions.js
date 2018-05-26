'use strict';

const routeDB = require('./routeDB');
const maps = require('@google/maps');
const googleMapsClient = maps.createClient({
  Promise: Promise
});

const getDirections = async function (coordinates, token) {
  let totalValues;

  let route = coordinates.reduce((route, pt, i) => {
    if (i === 0) {
      route.start = pt;
    } else if (i === coordinates.length - 1) {
      route.end = pt;
    } else {
      route.wypt.push(pt);
    }

    return route;
  }, {
    start: null,
    end: null,
    wypt: []
  });

  route.wypt = route.wypt.join('|');

  /* get the direction values from now sorted inputs */
  totalValues = await requestDirections(route.start, route.end, route.wypt);

  return totalValues;
}

function requestDirections (origin, destination, waypoints) {
  let opts = {
    origin: origin,
    destination: destination,
    mode: 'driving',
    alternatives: true
  };

  if (waypoints) {
    opts.waypoints = 'optimize:true|' + waypoints;
  }

  return googleMapsClient.directions(opts)
    .asPromise()
    .then((response) => {
      if (response.json.status === 'OK' && response.json.routes) {
        let returnValue = getTotalDistance(response.json.routes);
        returnValue.opts = opts;

        return returnValue;
      }

      return 'Error in googleMapsClient: ' + response.json.status;
    })
    .catch((err) => {
      return err;
    });
}

function getTotalDistance (routes) {
  if (!routes || routes.length < 1) {
    return 'no routes'
  }

  routes = routes[0];

  if (!routes.legs || !routes.legs.length) {
    return 'no legs'
  }

  let legs = routes.legs;
  let order = routes.waypoint_order;

  let distanceSum = 0;
  let durationSum = 0;

  for (let i = 0; i < legs.length; i++) {
    distanceSum += legs[i].distance.value;
    durationSum += legs[i].duration.value;
  }

  return {
    distance: distanceSum,
    duration: durationSum,
    order: order
  }
}

module.exports = {
  getDirections: getDirections,
  googleMapsClient: googleMapsClient // exposed gmaps instance for testing
};
