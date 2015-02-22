# amd_ww
Simple queue and submit system for javascript web workers.

This package allows for web workers to be spun off with a series of simple commands. In order for web workers to work, you must define a web worker file, as seen at the bottom of this page. Following this you initialize a web worker object with:
   ``` work1 = amd_ww.startWorkers({<i>start_obj</i>});```
This object must have the property 'filename' which is the name of your web workers file and it will return the **submit object** you use to submit jobs. All properties can be seen in the table below:

|Property|Description|
|---------------|----------------|
|filename|[*string, required*] This is the file responsible for processing the worker task.|
|num_workers|[*number*] This is the number of workers to create, default is 4, 2-4 is recommended.|
|callback|[*function*] This function is called following the creation of the **submit object**, not neccesary as this is not done asynchronously.|
|onError|[*function*] This will be called if a worker creates an error. Default is to call console.error and report an error message.|

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


        
