'use strict';

const routeDB = require('./routeDB');
const googleMapsClient = require('@google/maps').createClient({
  Promise: Promise
});



const directions = async function (coordinates, token) {
  let waypoints = [];
  let outputRoute = null;

  let STARTING_POINT = '';
  let DROPOFF_POINTS = [];
  let END_POINT = '';

  coordinates.forEach(function (point, index) {
    const pointStr = ''.concat(point[0],',',point[1]);

    if (index === 0) {
      STARTING_POINT = pointStr;
    } else {
      waypoints.push({ name: index, value: pointStr });
    }
  });


  let nextOrigin = STARTING_POINT;

  /* loop on the waypoints to see which is closest to the next origin */
  while (waypoints.length > 1) {
    let shortestWpt = await findShortestDistance(STARTING_POINT, waypoints);

    /* add the found shortest among the waypoints to the dropoff array */
    DROPOFF_POINTS.push(shortestWpt.value);

    /* remove the found waypoint from the selection of waypoints */
    waypoints = waypoints.filter((e) => e.name !== shortestWpt.name);

    /* found waypoint is the new STARTING_POINT by the next loop  */
    nextOrigin = shortestWpt.value;
  }

  /* last waypoint remaining will be the destination */
  END_POINT = waypoints[0].value;

  /* format waypoint syntax */
  DROPOFF_POINTS = DROPOFF_POINTS.map((pt) => pt = 'via:' + pt);
  DROPOFF_POINTS = DROPOFF_POINTS.join('|');

  /* get the direction values from now sorted inputs */
  outputRoute = await requestDirections(STARTING_POINT, END_POINT, DROPOFF_POINTS);

  routeDB.updateQueryStatus(token, outputRoute.distance ? 'success': 'error', outputRoute);
}

/* check whether which of the waypoints is closer to the origin */
function findShortestDistance (origin, waypoints) {
  let directionPromise = [];
  const dropoffpoints = waypoints;

  dropoffpoints.forEach(function (wpt) {
    directionPromise.push(requestDirections(origin, wpt.value));
  });

  return Promise.all(directionPromise)
    .then(function (routes) {
      dropoffpoints.map(function (wpt, index) {
        wpt.route = routes[index];
        return wpt;
      });
      dropoffpoints.sort((a, b) => {
        return Number(a.route.distance.value) - Number(b.route.distance.value)
      });

      return dropoffpoints[0];
    })
    .catch(function () {
      return 'error';
    });
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
