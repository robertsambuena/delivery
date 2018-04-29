# delivery
Mini delivery api

### How to install

 - Clone the repo
 - Download docker
 - Run the following commands

``` javascript
  docker-compose build
  docker-compose up
```

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