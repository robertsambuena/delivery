'use strict';

const routeDB = require('./routeDB');
const googleMapsClient = require('@google/maps').createClient({
  Promise: Promise
});


async function distances (dropoffs) {
  let allDistances;
  let allPoints = [];

  /* input reformatted */
  for (let i = 0 ; i < dropoffs.length ; i++) {
    let doffs = dropoffs[i];

    allPoints.push(doffs);
  }

  allDistances = await requestDistances(allPoints, allPoints);

  if (!Array.isArray(allDistances)) {
    return null;
  }

  /* restructure for easier lookup later */
  let formattedDist = allDistances.map(function (dist, i) {
  	let ndist = {
  	  name: allPoints[i],
      distWith: []
    };

  	dist.elements.forEach(function (d, i) {
  		ndist.distWith.push({
        to: allPoints[i],
        value: d
      });
  	});

  	return ndist;
  });

  return formattedDist;
}


function requestDistances (origins, destinations) {
  let opts = {
    origins: origins,
    destinations: destinations,
    mode: 'driving'
  };

  return googleMapsClient.distanceMatrix(opts)
    .asPromise()
    .then((response) => {
      if (response.json.rows) {
        return response.json.rows;
      }

      return 'Error in googleMapsClient distanceMatrix';
    })
    .catch((err) => {
      return 'error';
    })
}


module.exports = distances;
