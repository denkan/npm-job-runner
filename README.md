# Start and monitor one-at-a-time jobs which can be handled by Express routes

<!-- ![Build Status]() -->

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE.md)
[![npm version](https://badge.fury.io/js/denk-job-runner.svg)](https://badge.fury.io/js/denk-job-runner)

## Install

```sh
# npm
npm i -S denk-job-runner

# yarn
yarn add denk-job-runner
```

## Usage

### Run job by Express routes

```ts
import express from 'express';
import { JobRunner } from 'denk-job-runner';

const my10SecTask = () =>
  new Promise((resolve) => {
    let countSecs = 0;
    const myInterval = setInterval(() => {
      countSecs++;
      console.log(`Elapsed for ${countSecs} seconds`);

      if (countSecs >= 10) {
        clearInterval(myInterval);
        resolve('Job done after 10 sec');
      }
    }, 1000);
  });

const app = express();

const runner = new JobRunner(my10SecTask);

// adds /run, /status, /cancel routes
const jobRouter = runner.getRouter(express.Router());
app.use('/my-job', jobRouter);

app.listen(3000, () => {
  console.log('Server started @ http://localhost:3000/');
  console.log('http://localhost:3000/my-job/run');
  console.log('http://localhost:3000/my-job/status');
  console.log('http://localhost:3000/my-job/cancel');
});
```

### Support cancallable job + custom status info during job

```ts
import express from 'express';
import { JobRunner } from 'job-runner';

// when set to true, the interval will abort the job
let isCancelled = false;

// will be populated with stuff during job and be sent along with job status
const myStatusInfo = {};

const my10SecTask = () =>
  new Promise((resolve, reject) => {
    let countSecs = 0;

    const myInterval = setInterval(() => {
      if (isCancelled) {
        clearInterval(myInterval);
        reject('Job cancelled');
        return;
      }

      countSecs++;
      console.log(`Elapsed for ${countSecs} seconds`);

      myStatusInfo[`sec #${countSecs} fired`] = new Date();

      if (countSecs >= 10) {
        clearInterval(myInterval);
        resolve('Job done after 10 sec');
      }
    }, 1000);
  });

const app = express();

const runner = new JobRunner(my10SecTask, { statusInfo: myStatusInfo });
runner.on('start', () => {
  Object.keys(myStatusInfo).forEach((k) => delete myStatusInfo[k]);
});
runner.on('cancel', () => {
  isCancelled = true;
});
runner.on('error', () => {
  console.log('Got error, guess someone cancelled the job');
});

const jobRouter = runner.getRouter(express.Router());
app.use('/my-job', jobRouter);

app.listen(3000, () => {
  console.log('Server started @ http://localhost:3000/');
  console.log('http://localhost:3000/my-job/run');
  console.log('http://localhost:3000/my-job/status');
  console.log('http://localhost:3000/my-job/cancel');
});
```
