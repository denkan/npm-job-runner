import express from 'express';
import { JobRunner } from '../job-runner';

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

      // @ts-ignore
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
  // @ts-ignore - remove any statusInfo from previous runs
  Object.keys(myStatusInfo).forEach((k) => delete myStatusInfo[k]);
});
runner.on('cancel', () => {
  isCancelled = true;
});
runner.on('error', () => {
  console.log('Got error, guess someone cancelled the job');
});

const jobRouter = runner.getRouter(express.Router()); // adds /run, /status, /cancel routes
app.use('/my-job', jobRouter);

app.listen(3000, () => {
  console.log('Server started @ http://localhost:3000/');
  console.log('http://localhost:3000/my-job/run');
  console.log('http://localhost:3000/my-job/status');
  console.log('http://localhost:3000/my-job/cancel');
});
