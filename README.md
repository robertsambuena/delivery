# delivery
Mini delivery api
 - Take in array of coordinates in `POST /route` and return the shortest distance to travel via `GET /route`


### How to install

 - Clone the repo
 - Download docker
 - Run the following commands

``` javascript
  export GOOGLE_MAPS_API_KEY=AIzaSyB9UskukKrnK6BWgBq-af8zPvfABLsmW_o
  docker-compose build
  docker-compose up
```

### How to test

`npm run test`

### Sample input

* POST localhost:3000/route
```
  curl -X POST \
    http://localhost:3000/route \
    -H 'cache-control: no-cache' \
    -H 'content-type: application/json' \
    -d '[
    ["22.372081", "114.107877"],
    ["22.326442", "114.167811"],
    ["22.284419", "114.159510"]
  ]'
```

* GET localhost:3000/route/:token
```
curl -X GET \
  http://localhost:3000/route/JV5guVSREXWupSDUD7XL8v \
  -H 'cache-control: no-cache'
```
