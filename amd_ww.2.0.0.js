/*global Error, Promise, console, window, Worker, amd_ww */

//Writing to use promises
var amd_ww = (function () {
    'use strict';

    //variable declarations
    var lib, run, reportError, startWorkers, createWorkerObj;

    //variable defintions
    lib = {};

    lib.startWorkers = function (start_obj) {
        /*////////////////////////////////////////////////////////////////////////////////
        This function starts workers to have jobs passed to them. It is prudent to call
            <lib>.clearWorkers in the callback of the onComplete function to clear workers
            however when this is called it clears all existing workers.
        ARGV: start_obj has three options: 
            filename -  (string) all workers need a file to be run, pass that in here,
                this is the only required options
            num_workers - (number) the number of workers to start, I would recommend 
                no more than 2-4 workers at a time. (Default 4)
            callback - (function) called once workers are started. (Should pause program
                execution until they are called anyways, however if you are worried use
                this parameter.)
            onError - (function) called if a web worker reports an error, default
                is to call reportError()
        
        !! The return of this object is the object for submitting jobs/clearing jobs.

        TODO: fix these comments to make more sense, add information about what returned
            object can do, pass the returned object into callback as well as returning it,
            possibly give the returned object a start workers function so it can clear
            and restart all of its workers.
        */////////////////////////////////////////////////////////////////////////////////

        //Run the actual program
        return run(startWorkers)(start_obj);
    };

    reportError = function (err) {
        return console.error("Worker error: " + err + "\nTo display more information for any" +
            " function type <func_name> instead of <func_name>()");
    };

    run = function (func) {
        return function () {
            var y;
            try {
                y = func.apply(null, arguments);
            } catch (err) {
                reportError(err);
            }
            return y;
        };
    };

    startWorkers = function (start_obj) {
        //Variables Declarations
        var callback, errorFunc, filename, numJobs;

        //Variable Definitions
        start_obj = start_obj || undefined;
        if (!start_obj) {
            throw 'Must define start_obj with at least the workers file.';
        }
        callback = start_obj.callback !== undefined ?  start_obj.callback : function () {
            return;
        };
        errorFunc = start_obj.onError || reportError;
        reportError = errorFunc;
        numJobs = start_obj.num_workers !== undefined ? start_obj.num_workers : 4;
        numJobs *= 1;
            //Coerces into a number drops decimals if .000... 
        filename = start_obj.filename;

        //Make sure workers are available
        if (!window.Worker) {
            throw 'Workers are not available in this browser.';
        }

        //Check Variable definitions
        if (isNaN(numJobs) || numJobs !== parseInt(numJobs, 10)) {
            throw 'num_workers must be an integer';
        }
        if (typeof callback !== 'function') {
            throw 'callback must be a function';
        }
        if (typeof errorFunc !== 'function') {
            throw 'onError must be a function';
        }
        //This is the first check for a filename, the worker will do the second check
        if (typeof filename !== 'string' || !filename.match(/\.js$/)) {
            throw 'Must pass in a filename as a string for worker functionality';
        }
        return createWorkerObj(start_obj);
    };

    createWorkerObj = function (start_obj) {
        //Declare local vars
        var jobsArray, sublib, paused, all,
            startJob, submitJob, workersArr, nextJob, createWorkPromise,
            promiseArray, pausedPromise, promiseFunction;

        //Define local vars
        jobsArray = [];
        promiseArray = [];
        sublib = Object.create(Promise); //This is key, sets sublib as a Promise object
        workersArr = [];
        paused = false;

        //Global function declarations
        sublib.clear = function () {
            var i;

            //Remove all methods on the object
            delete sublib.submit;
            delete sublib.all;
            delete sublib.clear;
            delete sublib.pause;
            delete sublib.resume;
            delete sublib.race;
            delete sublib.resolve;
            delete sublib.reject;

            //Once all workers are done running, then delete them, then return the
                // array as the variable in the next promise
            return all().then(function (x) {
                for (i = 0; i < workersArr.length; i += 1) {
                    if (workersArr[i] !== undefined) {
                        workersArr[i][0].terminate();
                        workersArr[i] = undefined;
                    }
                }
                //Because this can be reassigned by the pause/resume
                delete sublib.submit;

                return x;
            });
        };

        sublib.submit = function (job) {
            /*////////////////////////////////////////////////////////////////////////////////
            This function adds a job to the queue of jobs to accomplish
            ARGV: job - (object, required) This will be submitted to the worker file, the file must then
                    know how to handle the submission.
                callback - (function) function to be preformed once the submitted job is 
                     finished, take the return parameter from a web worker which is an object 
                    of this structure:
                        {"ports":<array>,
                        "cancelBubble":<bool>,
                        "cancelable":<bool>,
                        "source":<object>,
                        "eventPhase":<number, as string>,
                        "timeStamp":<number as string>,
                        "lastEventId":<string>,
                        "currentTarget":<object>,
                        "target":<object>,
                ********"data":<return from worker>,******** Key element to process typically
                        "type":<string>,
                        "bubbles":<bool>,
                        "defaultPrevented":<bool>,
                        "origin":<string>,
                        "returnValue":<bool>,
                        "srcElement":<object>}
            */////////////////////////////////////////////////////////////////////////////////

            //Run the actual program
            return run(submitJob)(job);
        };

        sublib.pause = function () {
            //Defines a promise that once completed can be
                //referenced to resume execution
            var buffer = [];

            //Redefine submit job function temporarily
            sublib.submit = function (message) {
                //variable definitions
                var jobP;

                //Create the job promise, add it to the approriate job array
                jobP = promiseFunction(buffer, message);

                //Add the job to the list of promises
                promiseArray.push(jobP);

                //Return the Promise to the user
                return jobP;
            };

            //
            pausedPromise = sublib.all().then(function (x) {
                //Now actually paused
                paused = true;

                //Reset functions
                jobsArray = jobsArray.concat(buffer);
                sublib.submit = submitJob;

                //Return 'x' so that then still works
                return x;
            });

            return pausedPromise;
        };

        sublib.resume = function () {
            // Utilizes the promise executed by pause to resume execution
            pausedPromise.then(function (x) {
                paused = false;
                nextJob();
                return x;
            });
            return pausedPromise;
        };

        //Global redefine all and race to not need the array expicitly defined.
        sublib.all = function (array) {
            /*////////////////////////////////////////////////////////////////////////////////
            This function sets the function to be called once all processes are complete
                it MUST be called after all jobs have been submitted and must be passed a 
                callback function. It is prudent to call <lib>.clearWorkers in the callback 
                of this function to clear workers, however when they are automatically cleared
                if more are started.
            ARGV: callback - (function, required) function to execute once all submitted jobs have ran.
                    takes no parameters.
            */////////////////////////////////////////////////////////////////////////////////

            //Run the actual program
            return run(all)(array);
        };

        sublib.race = function (array) {
            var promRet;
            if (array && array.length > 0) {
                promRet = Promise.all(array);
            } else {
                promRet = Promise.all(promiseArray);
            }
            return promRet;
        };

        //Local functions
        all = function (array) {
            var promRet;
            if (array && array.length > 0) {
                promRet = Promise.all(array);
            } else {
                promRet = Promise.all(promiseArray);
            }
            return promRet;
        };

        startJob = function (workerToStart) {
            //Variables declarations
            var success, error, job, message, startWork;

            //Variable definitions

            startWork = workersArr[workerToStart][0];
            workersArr[workerToStart][1] = true; //This is to make sure multiple jobs are not
                //submitted

            //Make sure we are not paused
            if (paused) {
                workersArr[workerToStart][1] = false;
                return;
            }

            //Make sure there are jobs to do
            if (jobsArray.length > 0) {
                job = jobsArray.shift();
                message = job[0];
                success = job[1];
                error = job[2];
            } else {
                workersArr[workerToStart][1] = false;
                return;
            }

            //Start the job, then once the job is done...
            startWork(message).then(function (res) {
                //Call the succuess function if no error is create
                success(res);
            }, function (res) {
                //Otherwise call the failure function
                error(res);
            }).then(function () {
                //Start a new job either way
                startJob(workerToStart);
            });
        };

        submitJob = function (message) {
            //variable definitions
            var jobP;

            //Create the job promise, add it to the approriate job array
            jobP = promiseFunction(jobsArray, message);

            //Add the job to the list of promises
            promiseArray.push(jobP.catch(function (err) {
                console.error(err);
                return undefined; //This insures that promiseArray.all 
                        // works, and just returns undefined for failed,
                        // but completed work.
            }));

            //Return the Promise to the user
            return jobP;
        };

        nextJob = function () {
            //Find any workers that are not currently running a job
                //and attempts to start one.

            //Variable Declaration
            var i;

            //Check if there are workers available to submit jobs to
            for (i = 0; i < workersArr.length; i += 1) {
                if (!workersArr[i][1]) {
                    startJob(i);
                    break;
                }
            }
        };

        promiseFunction = function (array, message) {
            //This takes the array of interest and the message and
                //add the jobs to the queue
            return new Promise(function (resolve, reject) {

                //Add the job to the queue, this will eventual resolve
                array.push([message, resolve, reject]);

                //Now that the job is to the queue added, start running jobs
                nextJob();
            });
        };

        createWorkPromise = function (filename) {
            var worker, workerPromiseObject;
            worker = new Worker(filename);
            workerPromiseObject = function (message) {
                return new Promise(function (resolve, reject) {
                    //What to do when the worker comes back
                    worker.onmessage = function (e) {
                        resolve(e.data);
                    };
                    worker.onerror = function (e) {
                        reject('ERROR: Line ' + e.lineno + ' in ' + e.filename + ': ' + e.message);
                    };

                    //Post worker job, cleaning object first as needed
                    if (typeof message === 'object') {
                        worker.postMessage(JSON.parse(JSON.stringify(message)));
                    } else {
                        worker.postMessage(message);
                    }
                });
            };

            //This ensures that the worker can be terminated.
            workerPromiseObject.terminate = function () {
                worker.terminate();
            };

            return workerPromiseObject;
        };

        //Actually start the workers for this scope
        (function () {
            var filename, numJobs, i;
            //callback = start_obj.callback || function () {};

            numJobs = start_obj.num_workers !== undefined ? start_obj.num_workers : 4;
            numJobs *= 1;
                //Coerces into a number drops decimals if .000... 
            filename = start_obj.filename;

            //Actually start the workers
            for (i = 0; i < numJobs; i += 1) {
                //This create a function that is passed a message and returns a promise
                workersArr[i] = [createWorkPromise(filename), false];
            }
        }());

        //return lib
        return sublib;
    };
    return lib;
}());
