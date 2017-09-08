var ghpages = require('gh-pages');
var path = require('path');
 
ghpages.publish('_book', function(err) {
    throw err;
});