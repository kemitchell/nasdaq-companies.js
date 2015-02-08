var JSONStream = require('JSONStream');
var byline = require('byline');
var FTPClient = require('ftp');
var through = require('through2');
var merge = require('util-merge');

var SERVER = 'ftp.nasdaqtrader.com';
var LISTED_TXT = 'SymbolDirectory/nasdaqlisted.txt';
// var TRADED_TXT = 'SymbolDirectory/nasdaqtraded.txt';

var FIELDS = [
  {name: 'symbol'},
  {name: 'security'},
  {
    name: 'category',
    filter: {
      Q: 'NASDAQ Global Select Market',
      G: 'NASDAQ Global Market',
      S: 'NASDAQ Capital Market'
    }
  },
  {name: 'test', filter: {Y: true, N: false}},
  {
    name: 'status',
    filter: (function() {
      var DEFAULT_STATUS = {
        deficient: false,
        deliinquent: false,
        bankrupt: false
      };
      var STATUSES = {
        D: {deficient: true},
        E: {delinquent: true},
        Q: {bankrupt: true},
        N: {normal: true},
        G: {deficient: true, bankrupt: true},
        H: {deficient: true, delinquent: true},
        J: {delinquent: true, bankrupt: true},
        K: {deficient: true, delinquent: true, bankrupt: true}
      };

      return function(string) {
        return merge(DEFAULT_STATUS, STATUSES[string]);
      };
    })()
  },
  {
    name: 'lot',
    filter: function(string) {
      return parseInt(string);
    }
  }
];

var client = new FTPClient();
client
  .on('ready', function() {
    client.get(LISTED_TXT, function(error, stream) {
      if (error) {
        process.exit(1);
      } else {
        stream
          // Read by line.
          .pipe(byline.createStream())
          // Filter out the timestamp and stringify.
          .pipe(through.obj(function(line, encoding, callback) {
            line = line.toString();
            if (line.indexOf('File Creation Time') > -1) {
              callback();
            } else {
              callback(null, line);
            }
          }))
          // Parse fields.
          .pipe(through.obj(function(line, encoding, callback) {
            var split = line.split('|');
            var object = split.reduce(function(object, element, index) {
              var instructions = FIELDS[index];
              var value;
              if (instructions.hasOwnProperty('filter')) {
                var filter = instructions.filter;
                value = typeof filter === 'function' ?
                  filter(element) : filter[element];
              } else {
                value = element;
              }
              object[instructions.name] = value;
              return object;
            }, {});
            // Split the security name to find issuer and type.
            var securitySplit = object.security.split(' - ');
            object.issuer = securitySplit[0];
            object.type = securitySplit[1];
            callback(null, object);
          }))
          // Write a JSON array of objects.
          .pipe(JSONStream.stringify())
          .on('end', process.exit.bind(process, 0))
          .pipe(process.stdout);
      }
    });
  });

client.connect({host: SERVER});
