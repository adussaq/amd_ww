/*global self*/

(function () {
    'use strict';

    //This is the worker being called.
    self.onmessage = function (event) {
        //variable declarations
        var data, result;

        //variable definitions - this is where your 'cleaned' object is held
        data = event.data;

        //Do your math or other functions
        result = data.a * data.b;

        //return result to the calling function
        self.postMessage(result);
    };

}());