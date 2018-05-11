'use strict';

const distances = require('./distances');
const directions = require('./directions');
const routeDB = require('./routeDB');

let ALLDISTANCES;
let saveToken = null;
let dropOffs = [];
let population = [];
let popSize = 10;
let fitness = [];
let bestDist = Infinity;
let bestList = [];
let generationsLimit = 999;
let activeGenerations = 0;

async function solver (coor, token) {
  let coorList = coor.map(function (cr) {
    return cr.join(',');
  });

  saveToken = token;
  activeGenerations = 0;

  ALLDISTANCES = await distances(coorList);

  if (!ALLDISTANCES) {
    return routeDB.updateQueryStatus(token, null, 'error');
  }

  let initialDist = calcDistance(coorList);
  bestDist = initialDist;
  bestList = coorList;

  for (let i = 0; i < popSize; i++) {
    population[i] = shuffle(coorList);
  }

  /* super loop */
  while(activeGenerations <= generationsLimit) {
    calculateFitness(); // if there's new best, activeGenerations = 0
    nextGeneration();
    activeGenerations++;
  }

  directions(bestList, token);
}

/* algorithms */

function nextGeneration () {
  let newPopulation = [];

  for (let i = 0; i < population.length; i++) {
    let orderA = pickOne(population, fitness);
    let orderB = pickOne(population, fitness);
    let order = crossOver(orderA, orderB);

    mutate(order);
    newPopulation[i] = order;
  }

  population = newPopulation;
}

/* pick one depending on the random & fitness number */
function pickOne (list, fitness) {
  let index = 0;
  let r = Math.random();

  while(r > 0) {
    r = r - fitness[index];
    index++;
  }

  index--;

  return list[index].slice();
}

/* cross over by getting a random chunk of the first order */
/* and then filling in the missing points from the second order */
function crossOver (orderA, orderB) {
  let firstLen = orderA.length;
  let start = Math.floor(Math.random(firstLen));
  let end = Math.floor((start + 1 + Math.random()) * firstLen);
  let newOrder = orderA.slice(start, end);

  for (let i = 0; i < orderB.length; i++) {
    let point = orderB[i];
    if (!newOrder.includes(point)) {
      newOrder.push(point);
    }
  }

  return newOrder;
}

/* mutate by swapping the neighbor */
function mutate (order) {
  let total = order.length;
  let randomSpectrum = 1 + Math.random() * (order.length - 1);
  let indexA = Math.floor(randomSpectrum);
  let indexB = (indexA + 1) % total;

  indexB = indexB === 0 ? 1 : indexB; // to not mutate the first element
  swap(order, indexA, indexB);
}

function calculateFitness () {
  let sum = 0;

  for (let i = 0; i < population.length; i++) {
    let dist = calcDistance(population[i]);
    if (dist < bestDist) {
      bestDist = dist;
      bestList = population[i];
      activeGenerations = 0;
    }

    /* exponential 8 */
    fitness[i] = 1 / (Math.pow(dist, 8) + 1);
  }

  /* normalize fitness, so sum of all fitness per population is 1 */

  for (let i = 0; i < fitness.length; i++) {
    sum += fitness[i];
  }

  for (let i = 0; i < fitness.length; i++) {
    fitness[i] = fitness[i] / sum;
  }
}

/* shuffle everything aside from the first element */
function shuffle(array) {
  let m = array.length - 1;
  let t, i;

  // While there remain elements to shuffle…
  while (m - 1) {

    // Pick a remaining element…
    i = Math.floor(1 + Math.random() * m--);

    // And swap it with the current element.
    t = array[m];
    array[m] = array[i];
    array[i] = t;
  }

  return array.slice();
}

function swap (list, indexA, indexB) {
  let temp = list[indexA];
  list[indexA] = list[indexB];
  list[indexB] = temp;
}

function calcDistance (points) {
  let sum = 0;

  for (let i = 0; i < points.length - 1; i++) {
    let point = points[i];
    let nextPoint = points[i+1];
    let d = getPartnerDist(point, nextPoint);
    sum += d;
  }

  return sum;
}

function getPartnerDist (pointA, pointB) {
  let parentPt = ALLDISTANCES.filter(obj=>obj.name === pointA)[0];
  let childPt = parentPt.distWith.filter(obj=>obj.to === pointB)[0];

  return childPt.value.distance.value;
}

module.exports = solver;
