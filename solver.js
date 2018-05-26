'use strict';

const directions = require('./directions');
const routeDB = require('./routeDB');

async function solver (coor, token) {
  let possibleRoutes = [];
  const getDirections = directions.getDirections;
  let coorList = coor.map(function (cr) {
    return cr.join(',');
  });

  if (!coorList) {
    return routeDB.updateQueryStatus(token, 'error');
  }

  let lastIndex = coorList.length - 1;

  /* get all order where every dropoff is a destination */
  /* and let gApi handle the order of dropoffs via waypoints=optimize:true */
  possibleRoutes.push(getDirections(coorList));

  for (let i = 1; i < lastIndex; i++) {
    let newOrder = swap(coorList, i, lastIndex);
    possibleRoutes.push(getDirections(newOrder));
  }

  let bestRoute = await Promise.all(possibleRoutes)
    .then(function (results) {
      /* get the least distance from all routes */
      let bestResult = results.reduce((best, current) => {
        if (current.distance < best.distance) {
          best = current;
        }

        return best;
      }, {
        distance: Infinity
      });

      return bestResult;
    }).catch(function (err) {
      return {
        status: 'error',
        message: err
      }
    });

  if (bestRoute.opts) {
    /* reformat bestRoute to fulfill output requirements */
    bestRoute.input = [ bestRoute.opts.origin ];

    if (bestRoute.opts.waypoints) {
      let wypts = bestRoute.opts.waypoints;
      let order = bestRoute.order;

      wypts = wypts.split('|').slice(1);

      if (order) {
          wypts = order.map(oi => wypts[oi]);
      }

      bestRoute.input = bestRoute.input.concat(wypts);
    }

    bestRoute.input.push(bestRoute.opts.destination);

    /* delete unnecessary data */
    delete bestRoute.opts;
    delete bestRoute.order;
  }

  routeDB.updateQueryStatus(token, bestRoute);
}

function swap (list, indexA, indexB) {
  let newList = list.slice();
  let temp = newList[indexA];
  newList[indexA] = newList[indexB];
  newList[indexB] = temp;

  return newList;
}

module.exports = solver;
