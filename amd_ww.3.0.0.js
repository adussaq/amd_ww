/*global Error, Promise, console, window, Worker, amd_ww */

//Writing to use promises
(function (exports) {
    'use strict';

    //variable declarations
    var startWorkers, createWorkerObj, lib;

    //variable defintions
    lib = {};

    lib.start = function (start_obj) {
        /*
        ////////////////////////////////////////////////////////////////////////////////
        This function starts workers to have jobs passed to them. It is prudent to call
            <lib>.clearWorkers in the callback of the onComplete function to clear workers
            however when this is called it clears all existing workers.
        ARGV: start_obj has three options:
            filename -  (string) all workers need a file to be run, pass that in here,
                this is the only required options
            num_workers - (number) the number of workers to start, I would recommend
                no more than 2-4 workers at a time. (Default 4)
        !! The return of this object is the object for submitting jobs/clearing jobs.

        TO-DO: fix these comments to make more sense, add information about what returned
            object can do, pass the returned object into callback as well as returning it,
            possibly give the returned object a start workers function so it can clear
            and restart all of its workers.
        */
        ////////////////////////////////////////////////////////////////////////////////

        //Run the actual program
        return startWorkers(start_obj);
    };

    startWorkers = function (start_obj) {
        //Variables Declarations

        //Variable Definitions
        start_obj = start_obj || undefined;

        //Make sure workers are available
        try {
            if (!start_obj) {
                throw 'Must define start_obj with at least the workers file.';
            }
            start_obj.num_workers = start_obj.num_workers || 4;
            start_obj.num_workers *= 1;

            if (!window.Worker) {
                throw 'Workers are not available in this browser.';
            }

            //Check Variable definitions
            if (isNaN(start_obj.num_workers) || typeof start_obj.num_workers !== 'number') {
                throw 'num_workers must be an integer';
            }
            //This is the first check for a filename, the worker will do the second check
            if (typeof start_obj.filename !== 'string' || !start_obj.filename.match(/\.js$/)) {
                throw 'Must pass in a filename as a string for worker functionality';
            }
        } catch (err) {
            console.error(err);
            return;
        }
        return createWorkerObj(start_obj);
    };

    createWorkerObj = function (start_obj) {
        //Declare local vars
        var jobsArray, sublib, promiseFunction, startJob, submitJob, workersArr,
                nextJob, createWorkPromise, clear;

        //Define local vars
        jobsArray = [];
        sublib = Object.create(Promise); //This is key, sets sublib as a Promise object
        workersArr = [];

        //Global function declarations
        sublib.submit = function (job) {
            /*
                ////////////////////////////////////////////////////////////////////////////////
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
                ////////////////////////////////////////////////////////////////////////////////
            */

            //Run the actual program
            return submitJob(job);
        };

        sublib.clear = function () {
            //terminates the web workers
            clear = function () {
                workersArr.map(function (worker) {
                    worker[0].terminate();
                });
                delete sublib.submit;
                delete sublib.clear;
            };
            return;
        };

        clear = function () {
            //this is set above, needs a default value though
            return;
        };

        //Local functions
        startJob = function (workerToStart) {
            //Variables declarations
            var i, success, error, job, message, startWork, allDone = true;

            //Variable definitions

            startWork = workersArr[workerToStart][0];
            workersArr[workerToStart][1] = true; //This is to make sure multiple jobs are not
                //submitted

            //Make sure there are jobs to do
            if (jobsArray.length > 0) {
                job = jobsArray.shift();
                message = job[0];
                success = job[1];
                error = job[2];
            } else {
                workersArr[workerToStart][1] = false;
                for (i = 0; i < workersArr.length; i += 1) {
                    if (workersArr[i][1]) {
                        allDone = false;
                    }
                }
                if (allDone) {
                    clear();
                }
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
            var i;

            //Actually start the workers
            for (i = 0; i < start_obj.num_workers; i += 1) {
                //This create a function that is passed a message and returns a promise
                workersArr[i] = [createWorkPromise(start_obj.filename), false];
            }
        }());

        //return lib
        return sublib;
    };

    exports.amd_ww = lib;

}(window));
