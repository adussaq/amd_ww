# amd_ww
Simple queue and submit system for javascript web workers. At the bottom of this readme is a simple example, downloading this package comes with one as well, and one can also be found at: ...

This package allows for web workers to be spun off with a series of simple commands. In order for web workers to work, you must define a web worker file, as seen at the bottom of this page. Two major objects are avaliable, a **create object** and a **submit object**. Their properties are the the tables below:

###**Create Object** properties###
|Property|Description|
|---------------|----------------|
|startWorkers|[*function*] This function takes one argument, start_obj  [*required*] (more information below) and returns a **submit object**|

###**Submit Object** Methods###
|Property|Description|
|---------------|----------------|
|submitJob|[*function*] This takes two arguments, an object [*required*] to be passed to the web worker and a callback function [*optional*] that will be passed the results of the job on an object with many properties, 'data' will contain the results.|
|onComplete|[*function*] This is takes one argument, a function [*required*], called asynchronously once all submitted jobs have been completed. It can be called as many times as needed throughout the course of the code, however minimizing it will maximize the speed at which results are returned. |
|clearWorkers|[*function*] This takes a callback function [*optional*], and clears the workers and the **submit object** itself. This should only be done in the callback from an onComplete function.|

To initialize the work flow you create a **submit object** with:
   ``` work1 = amd_ww.startWorkers({<i>start_obj</i>});```
In this case the **submit object** returned is ```work1``` which you will use to submit jobs. The start object has many parameters, all can be seen in the table below:

####start_obj options####
|Property|Description|
|---------------|----------------|
|filename|[*string, required*] This is the file responsible for processing the worker task.|
|num_workers|[*number, optional*] This is the number of workers to create, default is 4, 2-4 is recommended.|
|callback|[*function, optional*] This function is called following the creation of the **submit object**, not neccesary as this is not done asynchronously.|
|onError|[*function, optional*] This will be called if a worker creates an error. Default is to call console.error and report an error message.|

##Below is the javascript that allows you to create a web worker and submit a job.
    work1 = amd_ww.startWorkers({filename:'worker1.js'});
    //Submit all of your jobs
    work1.submitJob({a:7,b:2},function(x){
        //x.data contains the result of the job
        console.log('7+2=', x.data);
    });

    //Essentially waits for all jobs to finish, then continues with the callback
    work1.onComplete(function (x) {
        console.log('Worker one all finished!');
        //If this is part of an entire ecosystem, it is a good idea to clear these with work1.clearWorkers([callback]);
        });

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


        
