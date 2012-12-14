
/**
 * Module dependencies.
 */

var express = require('express')
  , routes = require('./routes')
  , http = require('http')
  , path = require('path')
  , fs = require('fs');

var app = express();
var options = JSON.parse(fs.readFileSync('options.json'));

app.configure(function(){
  app.set('port', options.port || process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(require('stylus').middleware(__dirname + '/static'));
  app.use(express.static(path.join(__dirname, 'static')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

app.locals(JSON.parse(fs.readFileSync('options.json')));

app.get('/', routes.login.login);
app.post('/', routes.login.login);
app.get('/register/', routes.login.register);
app.post('/register/', routes.login.register);
app.get('/activate/', routes.login.activate);

http.createServer(app).listen(app.get('port'), function(){
  console.log("Express server listening on port " + app.get('port'));
});
