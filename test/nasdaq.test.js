/* jshint mocha: true */
var expect = require('chai').expect;
var nasdaq = require('..');

var toString = Object.prototype.toString;

describe('NASDAQ Companies Data', function() {
  it('is a list of objects', function() {
    expect(Array.isArray(nasdaq));
    expect(nasdaq.every(function(element) {
      return toString.call(element) === '[object Object]';
    }));
  });

  it('computes issues names', function() {
    expect(nasdaq.every(function(element) {
      return typeof element.issuer === 'string' &&
        element.issuer.length > 0;
    }));
  });
});
