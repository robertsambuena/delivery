'use strict';

const TokenGenerator = require('uuid/v4');
const mongoClient = require('mongodb').MongoClient;
const MONGO_URL = 'mongodb://mongo:27017';

let routeDB;

/* workaround for when app starts while mongo's still loading in docker */
function connectWithRetry () {
  console.log('\n\n\n * * * * MongoDB connection with retry * * * * \n\n\n');

  return mongoClient.connect(MONGO_URL, function(err, connection) {
    if (err) {
      console.error('\n\n\nConnection failed, retrying in 5 seconds', err);
      setTimeout(connectWithRetry, 5000);
    } else {
      initiateDB(connection);
    }
  });
};

function initiateDB (connection) {
  const db = connection.db('routeDB');
  routeDB = db.collection('routes');

  console.log('\n\n\n * * * * Database connection established * * * * \n\n\n');
}

function saveQuery (input) {
  let query = {
    token: TokenGenerator(),
    input: input,
    status: 'in progress'
  };

  routeDB.insert(query);
  return query.token;
}

function updateQueryStatus (token, value) {
  let status = typeof value === 'string' ? 'error': 'success';

  let set = {
    status: status,
    value: value
  };

  if (value.input) {
    set.input = value.input;
  }

  routeDB.findAndModify(
    { token: token },
    [],
    {
      $set: set
    },
    { new: true }
  );
}

function findQuery (token) {
  return routeDB.findOne(
    { token: token }
  )
}

module.exports = {
  connectWithRetry: connectWithRetry,
  saveQuery: saveQuery,
  updateQueryStatus: updateQueryStatus,
  findQuery: findQuery
};
