# amd_ww v2
Simple queue and submit system for javascript web workers. At the bottom of this readme is a simple example, downloading this package comes with one as well, and one can also be found at: http://alexdussaq.info/amd_ww.

The readme for v1 can be viewed at: https://github.com/adussaq/amd_ww/blob/f99e9f38eecfbe762b42c7bdfeb9e455a480b230/README.md

This package allows for web workers to be spun off with a series of simple commands. In order for web workers to work, you must define a web worker file, as seen at the bottom of this page. Two major objects are avaliable, a **create object** and a **submit object**. Their properties are the the tables below:

###**Create Object** properties###
|Property|Description|
|---------------|----------------|
|startWorkers|[*function*] Takes one argument, start_obj [*required, more information below*] and returns a **submit object**|

###**Submit Object** Methods###
This object is equivilent to a **Promise** object with a few additional methods and slighly changed all/race functions. Please see: <a href="http://www.html5rocks.com/en/tutorials/es6/promises/">HTML5 Rocks: Promises</a> for a more full description of promises. These are the methods that have been changed/added on and are essential for running the program.

|Property|Description|
|---------------|----------------|
|submit|[*function*] Takes one argument, an object [*required*] to be passed to the web worker (will be cleaned of any functions) and returns a thenable promise.|
|all|[*function*] Takes one argument, an array [*optional*], this will be called asynchronously once all jobs in the array have been completed. If an array is not provided then it will utilize all jobs previously submitted using this object, all failed jobs return undefined in this case (If utilizing with an array, then any uncaught errors will not allow this function to work at all). It returns a thenable promise.|
|race|[*function*] Takes one argument, an array [*optional*], this will be called asynchronously once any of the jobs in the array have been completed successfully. If an array is not provided then it will utilize all jobs previously submitted using this object. It returns a thenable promise. |
|pause|[*function*] Takes no arguments, it pauses the execution of all future 'submit' calls until resume is called. This happens synchronously, as in it does not require a then, nor a callback. Despite the lack of reuqirement, this does return a thenable promise.|
|resume|[*function*] Takes no arguments, it resumes the execution of the job queue including all jobs submitted since the 'pause' function was called. This happens synchronously, as in it does not require a then, nor a callback. Despite the lack of reuqirement, this does return a thenable promise.|
|clear|[*function*] Takes no arguments, clears the workers and the **submit object** itself. This occurs only once all submitted jobs have been completed.|



###**Promise Object** Methods###
Please see: <a href="http://www.html5rocks.com/en/tutorials/es6/promises/">HTML5 Rocks: Promises</a> for a more full description of promises. Detailed below are the methods that are utilized in the examples.

|Property|Description|
|---------------|----------------|
|then|[*function*] Takes up to two arguments, both functions. The first is called when and if the promise returns a result. The second is called when and if the promise returns an error. Both functions take one variable, the object returned from the execution of the previous promise.|
|catch|[*function*] Takes one argument, a function. This is called if a promise earlier in the chain returns an error.|

To initialize the work flow you create a **submit object** with:
   ``` work1 = amd_ww.startWorkers({_start_obj_});```
In this case the **submit object** returned is ```work1``` which you will use to submit jobs. The start object has two parameters, described below:

####startWorkers: start_obj options####
|Property|Description|
|---------------|----------------|
|filename|[*string, required*] This is the file responsible for processing the worker task. Described below and an example is at the bottom of the page.|
|num_workers|[*number, optional*] This is the number of workers to create, default is 4, 2-4 is recommended.|

In addition to the object used, a web worker file, is necessary. The web worker file must have at least one function: ```self.onmessage(event)```. This function will be pased the data from ```<submit object>.submit``` on the data property, in this case ```event.data```. Following this ```self.postmessage(_results_)``` must be called to pass your results to the then function that is returned as the promise from the submit function. Two web worker examples follow. These can both be executed in the console at: http://alexdussaq.info/amd_ww.


##Simple of web workers in action.##
    work1 = amd_ww.startWorkers({filename:'worker1.js'});
    //Submit all of your jobs
    work1.submit({a:7,b:2}).then(function (x) {
        //x contains the result of the job
        console.log('7 + 2 = ', x);
    });
    work1.submit({a:3,b:4}).then(function (x) {
        //x contains the result of the job
        console.log('3 + 4 = ', x);
    });

    //Essentially waits for all jobs to finish, then continues with the then
    work1.all().then(function (x) {
        //x is an array containing all results in the order submitted.
        console.log('Worker one all finished!');
    });

    //Clear the workers to free up memory
    work1.clear();

##Worker1.js
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
            result = data.a + data.b;

            //return result to the calling function
            self.postMessage(result);
        };

    }());

## A slightly more complicated example of web workers in action ##
    work1 = amd_ww.startWorkers({filename:'worker1.js'});
    work3 = amd_ww.startWorkers({filename:'worker3_failure.js'});

    //Set up jobs
    data = [{a:7,b:2}, 
            {a:9,b:1}, 
            {a:11,b:0},
            {a:13,b:-1},
            {a:15,b:-2}];

    data2 = [{a:14,b:4}, 
            {a:18,b:1}, 
            {a:22,b:0},
            {a:26,b:1},
            {a:30,b:4}];

    //Submit all of your jobs
    for (i = 0; i < data.length; i += 1) {
        //While adding a '.then' to this is the most efficeint way to analyze the data
            // for the purposes of this example we will wait till all jobs are done to
            // look at the results.
        work1.submit(data[i]);
    }

    //Once all jobs are finished display results.
    work1.all().then(function (x) {
        //x contains the results
        for (i = 0; i < data.length; i += 1) {
            console.log(data[i].a + " + " + data[i].b + " = " + x[i]);
        }
    });

    //Pause worker number one
    work1.pause();

    //Submit jobs while paused, none of these are executed at this point.
    for (i = 0; i < data2.length; i += 1) {
        (function (obj) {
            work1.submit(obj).then(function (x) { 
                //Note while faster, order will not be maintained.
                console.log(obj.a + " + " + obj.b + " = " + x);
            });
        }(data2[i]));
    }

    //All done? Not yet, nothing has been started till resume is called
    work1.all().then(function () {
        console.log('All Done with 1!');
    });

    //Start running, once completed above functions will be called.
    work1.resume()

    //Clear the workers to free up memory
    work1.clear();

    //This by design returns an error
    work3.submit({a:4, b:-2}).then(function(x) {
            //If it worked
            console.log('4 - -2 = ' + x);
        }, function (x) {
            //If it failed
            console.error('Yep, I found an error: ', x);
    });

    work3.clear();

##worker3_failure.js

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
            result = data.a - data.b;
            if (result || !result) {
                throw 'Result: ' + data.a + '-' + data.b + ' = ' + result +
                    ". This is an intentionally created and uncaught error!";
            }

            //return result to the calling function
            self.postMessage(result);
        };

    }());
