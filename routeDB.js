'use strict';

const TokenGenerator = require('uuid-token-generator');
const tokgen = new TokenGenerator();
const mongoClient = require("mongodb").MongoClient;
const MONGO_URL = "mongodb://mongo:27017";

let routeDB;

/* workaround for when app starts while mongo's still loading in docker */
const connectWithRetry = () => {
  console.log('\n\n\n * * * * MongoDB connection with retry * * * * \n\n\n');
  return mongoClient.connect(MONGO_URL).then(initiateDB);
};

mongoClient.connect(MONGO_URL).then(initiateDB)
  .catch((err) => {
    console.log(`\n\n\n MongoDB connection error: ${err} \n\n\n`);
    /* retry after 5 seconds */
    setTimeout(connectWithRetry, 5000);
  })

function initiateDB (connection) {
  const db = connection.db('routeDB');
  routeDB = db.collection('routes');

  console.log('\n\n\n * * * * Database connection established * * * * \n\n\n');
}

const db = {
  saveQuery: function (input) {
    let query = {
      token: tokgen.generate(),
      input: input,
      status: 'in progress'
    };

    routeDB.insert(query);
    return query.token;
  },
  updateQueryStatus: function (token, status, value) {
    let query = routeDB.findAndModify(
      { token: token },
      [],
      {
        $set: {
          status: status,
          value: value
        }
      },
      { new: true }
    );
  },
  findQuery: function (token) {
    return routeDB.findOne(
      { token: token }
    )
  }
}

module.exports = db;
