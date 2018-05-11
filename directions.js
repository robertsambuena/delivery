'use strict';

const routeDB = require('./routeDB');
const googleMapsClient = require('@google/maps').createClient({
  Promise: Promise
});

const directions = async function (coordinates, token) {
  let startingPoint = '';
  let dropoffPoints = [];
  let endPoint = '';
  let totalValues = 0;
  let status;
  let points = [];

  coordinates.forEach(function (point, index) {
    if (index === 0) {
      startingPoint = point;
    } if (index === coordinates.length - 1) {
      endPoint = point;
    } else {
      dropoffPoints.push(point);
    }

    points.push(point.split(','));
  });

  dropoffPoints = dropoffPoints.join('|');

  /* get the direction values from now sorted inputs */
  totalValues = await requestDirections(startingPoint, endPoint, dropoffPoints);

  routeDB.updateQueryStatus(token, points, totalValues);
}

function requestDirections (origin, destination, waypoints) {
  let opts = {
    origin: origin,
    destination: destination,
    mode: 'driving',
    alternatives: true
  };

  if (waypoints) {
    opts.waypoints = waypoints;
  }

  return googleMapsClient.directions(opts)
    .asPromise()
    .then((response) => {
      if (response.json.routes) {
        return getTotalDistance(response.json.routes);
      }

      return 'Error in googleMapsClient';
    })
    .catch((err) => {
      return err;
    })
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

  let distanceSum = 0;
  let durationSum = 0;

  for (let i = 0; i < legs.length; i++) {
    distanceSum += legs[i].distance.value;
    durationSum += legs[i].duration.value;
  }

  return {
    distance: distanceSum,
    duration: durationSum
  }
}

module.exports = directions;
