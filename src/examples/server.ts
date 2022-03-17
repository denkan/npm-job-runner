import express from 'express';
import { JobRunner } from '../job-runner';

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

const jobRouter = runner.getRouter(express.Router()); // adds /run, /status, /cancel routes
app.use('/my-job', jobRouter);

app.listen(3000, () => {
  console.log('Server started @ http://localhost:3000/');
  console.log('http://localhost:3000/my-job/run');
  console.log('http://localhost:3000/my-job/status');
  console.log('http://localhost:3000/my-job/cancel');
});
