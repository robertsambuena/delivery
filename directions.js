'use strict';

const routeDB = require('./routeDB');
const googleMapsClient = require('@google/maps').createClient({
  Promise: Promise
});

const directions = async function (coordinates, token) {
  let origin = '';
  let destination = '';
  let waypoints = '';
  let route;

  coordinates.forEach(function (point, index) {
    const pointStr = ''.concat(point[0],',',point[1]);

    if (index === 0) {
      origin = pointStr;
    } else if (index === coordinates.length - 1) {
      destination = pointStr;
    } else {
      waypoints = (waypoints !== '' ? '|': '') + 'via:' + pointStr;
    }
  })

  route = await requestDirections(origin, destination, waypoints);

  routeDB.updateQueryStatus(token, route.distance ? 'success': 'error', route);
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
        return getLeastDrivingTimeDistance(response.json.routes);
      }

      return 'Error in googleMapsClient';
    })
    .catch((err) => {
      return err;
    })
}

function getLeastDrivingTimeDistance (routes) {
  /* first sort by distance first then duration */
  routes.sort(
    (a, b) => {
      return Number(a.legs[0].distance.value) - Number(b.legs[0].distance.value)
           || Number(a.legs[0].duration.value) - Number(b.legs[0].duration.value)
         }
    );

  let nearestRoute = {
    distance: routes[0].legs[0].distance,
    duration: routes[0].legs[0].duration
  }

  return nearestRoute;
}


module.exports = directions;
