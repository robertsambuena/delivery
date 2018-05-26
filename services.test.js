'use strict';

const nock = require('nock');
const expect = require('chai').expect;
const sinon = require('sinon');
const routeDB = require('./routeDB');
const services = require('./services');
const directions = require('./directions');

const googleMapsClient = require('@google/maps').createClient({
  Promise: Promise
});

describe('POST /route', function () {
  let input, finalOrder;
  let updateStub, saveStub, gapiStub;
  let token, ctx, gapiFixtures;
  let firstOpts, secondOpts;
  let firstResponse, secondResponse;

  beforeEach(function () {

    const opts = {
      origin: '22.372081,114.107877',
      destination: '',
      mode: 'driving',
      alternatives: true,
      waypoints: ''
    };

    const response = {
      json: {
        status: 'OK',
        routes: [{
          waypoint_order: [0],
          legs: null
        }]
      }
    };

    input = [
    	['22.372081', '114.107877'],
    	['22.284419', '114.159510'],
      ['22.326442', '114.167811']
    ];

    finalOrder = [
    	['22.372081', '114.107877'],
    	['22.326442', '114.167811'],
      ['22.284419', '114.159510']
    ];

    ctx = {
      request: {
        body: input
      }
    };

    token = 'b540fdc8-faab-4043-a30b-62768a1a5639';

    updateStub = sinon.stub(routeDB, 'updateQueryStatus').callsFake(
      function () {
        return Promise.resolve();
      });

    saveStub = sinon.stub(routeDB, 'saveQuery').callsFake(function () {
      return token;
    });

    /* create two instances of `opts` and `results` for google maps
       directions api call */

    /* first call instance */
    gapiFixtures = [];

    firstOpts = Object.assign({}, opts);
    firstOpts.destination = '22.326442,114.167811';
    firstOpts.waypoints = 'optimize:true|22.284419,114.159510';

    firstResponse = JSON.parse(JSON.stringify(response));
    firstResponse.json.routes[0].legs = [{
      'distance': {
        'value': 15535
      },
      'duration': {
        'value': 985
      }
    },{
      'distance': {
        'value': 8579
      },
      'duration': {
        'value': 978
      }
    }];

    gapiFixtures.push({
      args: firstOpts,
      value: firstResponse
    });


    /* second call instance */
    secondOpts = Object.assign({}, opts);
    secondOpts.destination = '22.284419,114.159510';
    secondOpts.waypoints = 'optimize:true|22.326442,114.167811';

    secondResponse = JSON.parse(JSON.stringify(response));
    secondResponse.json.routes[0].legs = [{
      'distance': {
        'value': 10661
      },
      'duration': {
        'value': 1015
      }
    }, {
      'distance': {
        'value': 8702
      },
      'duration': {
        'value': 989
      }
    }];

    gapiFixtures.push({
      args: secondOpts,
      value: secondResponse
    });

    gapiStub = sinon.stub(directions.googleMapsClient, 'directions');

    gapiStub.withArgs(gapiFixtures[0].args)
      .callsFake(function () {
        return {
          asPromise: function () {
            return Promise.resolve(gapiFixtures[0].value);
          }
        }
      });

    gapiStub.withArgs(gapiFixtures[1].args)
      .callsFake(function () {
        return {
          asPromise: function () {
            return Promise.resolve(gapiFixtures[1].value);
          }
        }
      });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('.should return token immediately', function () {
    const setCoordinatesBody = services.setCoordinates.call(ctx);
    expect(setCoordinatesBody.token).to.equal(token);
  });

  it('.should produce the shortest distance', function () {
    const setCoordinatesBody = services.setCoordinates.call(ctx)

    setImmediate(function () {
      sinon.assert.calledOnce(updateStub);

      expect(updateStub.firstCall.args).to.deep.equal([
        token,
        {
          input: finalOrder.map(order => order.join(',')),
          distance: 19363,
          duration: 2004
        }
      ]);
    });
  });

  it('.input with different order of dropoffs should produce the same output',
    function () {
      const badCtx = Object.assign({}, ctx);
      const tempCoor = badCtx.request.body[1];
      badCtx.request.body[1] = badCtx.request.body[2];
      badCtx.request.body[2] = tempCoor;

      const setCoordinatesBody = services.setCoordinates.call(badCtx);

      setImmediate(function () {
        sinon.assert.calledOnce(updateStub);

        expect(updateStub.firstCall.args).to.deep.equal([
          token,
          {
            input: finalOrder.map(order => order.join(',')),
            distance: 19363,
            duration: 2004
          }
        ]);
      });
  });

  it('.should call google api twice if there\'s 3 coordinates', function () {
    const setCoordinatesBody = services.setCoordinates.call(ctx);
    sinon.assert.calledTwice(gapiStub);
  });

  it('.directions should have the right inputs from solver', function () {
    const setCoordinatesBody = services.setCoordinates.call(ctx);

    expect(gapiStub.firstCall.args[0]).to.deep.equal({
      origin: '22.372081,114.107877',
      destination: '22.326442,114.167811',
      mode: 'driving',
      alternatives: true,
      waypoints: 'optimize:true|22.284419,114.159510'
    });

    expect(gapiStub.secondCall.args[0]).to.deep.equal({
      origin: '22.372081,114.107877',
      destination: '22.284419,114.159510',
      mode: 'driving',
      alternatives: true,
      waypoints: 'optimize:true|22.326442,114.167811'
    });
  });

  it('.should return error for invalid input', function () {
    const badCtx = Object.assign({}, ctx);
    badCtx.request.body = 'badinput';

    const setCoordinatesBody = services.setCoordinates.call(badCtx);
    expect(setCoordinatesBody.error).to.equal('Invalid input');
  });

  it('.should return error when destination is not provided', function () {
    const badCtx = Object.assign({}, ctx);
    badCtx.request.body = ['22.372081'];

    const setCoordinatesBody = services.setCoordinates.call(badCtx);
    expect(setCoordinatesBody.error).to.equal('Destination should be provided');
  });

  it('.should return error for max coordinates exceeded', function () {
    const badCtx = Object.assign({}, ctx);
    for (let i = 0 ; i < 23; i++) {
      badCtx.request.body.push(['22.372081', '114.107877']);
    }

    const setCoordinatesBody = services.setCoordinates.call(badCtx);
    expect(setCoordinatesBody.error)
      .to.equal('Max number of coordinates exceeded');
  });

  it('.should return error when a coordinate is not an array', function () {
    const badCtx = Object.assign({}, ctx);
    badCtx.request.body[2] = 'badcoordinate';

    const setCoordinatesBody = services.setCoordinates.call(badCtx);
    expect(setCoordinatesBody.error).to.equal('Coordinate is not an array');
  });

  it('.should return error when a coordinate has missing lat or long',
    function () {
      const badCtx = Object.assign({}, ctx);
      badCtx.request.body[2] = [];

      const setCoordinatesBody = services.setCoordinates.call(badCtx);
      expect(setCoordinatesBody.error)
        .to.equal('Incomplete values for latitude & longitude');
    });

  it('.should return error when latitude is invalid', function () {
    const badCtx = Object.assign({}, ctx);
    badCtx.request.body[2] = ['badlat', '114.107877'];

    const setCoordinatesBody = services.setCoordinates.call(badCtx);
    expect(setCoordinatesBody.error).to.equal('Invalid latitude float value');
  });

  it('.should return error when longitude is invalid', function () {
    const badCtx = Object.assign({}, ctx);
    badCtx.request.body[2] = ['22.372081', 'badlong'];

    const setCoordinatesBody = services.setCoordinates.call(badCtx);
    expect(setCoordinatesBody.error).to.equal('Invalid longitude float value');
  });
});




describe('GET /route', function () {
  let routesFixture;

  beforeEach(function () {
    routesFixture = {
      'token' : 'b540fdc8-faab-4043-a30b-62768a1a5639',
      'input' : [
        '22.372081,114.107877',
        '22.326442,114.167811',
        '22.284419,114.159510'
      ],
      'status' : 'success',
      'value' : {
        'distance' : 19363,
        'duration' : 2004,
        'input' : [
          '22.372081,114.107877',
          '22.326442,114.167811',
          '22.284419,114.159510'
        ]
      }
    }
  });

  afterEach(function () {
    sinon.restore();
  });

  it('.should return success with good token', async function () {
    const ctx = {
      params: {
        token: 'goodtoken'
      }
    };

    sinon.stub(routeDB, 'findQuery').callsFake(function () {
      return Promise.resolve(routesFixture);
    });

    const getCoordinatesBody = await services.getCoordinates.call(ctx);

    expect(getCoordinatesBody).to.deep.equal({
      status: 'success',
      path: [
        '22.372081,114.107877',
        '22.326442,114.167811',
        '22.284419,114.159510'
      ],
      total_distance: 19363,
      total_time: 2004
    });
  });

  it('.should return in progress when processing is not yet done', async function () {
    const ctx = {
      params: {
        token: 'badtoken'
      }
    };

    sinon.stub(routeDB, 'findQuery').callsFake(function () {
      routesFixture.status = 'in progress';
      return Promise.resolve(routesFixture);
    });

    const getCoordinatesBody = await services.getCoordinates.call(ctx);

    expect(getCoordinatesBody.status).to.equal('in progress');
  });

  it('.should return invalid when there\'s no matching token', async function () {
    const ctx = {
      params: {
        token: 'nonmatchingtoken'
      }
    };

    sinon.stub(routeDB, 'findQuery').callsFake(function () {
      return Promise.resolve(null);
    });

    const getCoordinatesBody = await services.getCoordinates.call(ctx);

    expect(getCoordinatesBody.status).to.equal('failure');
    expect(getCoordinatesBody.error).to.equal('INVALID_TOKEN');
  });
});
