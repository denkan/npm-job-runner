import { IJobRunnerStatus, JobRunner } from './job-runner';

describe('JobRunner', () => {
  const waitASec = (secToWait = 1) => new Promise<void>((resolve) => setTimeout(resolve, secToWait * 1000));

  it('should create runnable job with default options', async () => {
    const runner = new JobRunner(() => waitASec());
    const startStatus = runner.run();
    expect(runner).toBeTruthy();
    expect(startStatus.init).toBe(true);
    expect(startStatus.running).toBe(true);
    expect(startStatus.startedAt).toBeDefined();
    expect(startStatus.elapsedSec).toBeDefined();
    expect(startStatus.runtimeLeftInSec).toBeDefined();
  });

  it('should have helper status props; isRunning, runtimeLeftInSec, hasRuntime', async () => {
    const maxRuntimeInSec = 1;
    const runner = new JobRunner(() => waitASec(0.2), { maxRuntimeInSec });
    runner.run();
    await waitASec(0.1);
    // job is currently running
    expect(runner.isRunning).toBe(true);
    expect(runner.runtimeLeftInSec).toBeLessThan(maxRuntimeInSec);
    expect(runner.hasRuntime).toBe(true);
    await waitASec(0.1);
    // job is finished
    expect(runner.isRunning).toBe(false);
    expect(runner.runtimeLeftInSec).toBe(maxRuntimeInSec); // when resetted = maxRuntimeInSec
    expect(runner.hasRuntime).toBe(true); // when resetted = true
  });

  it('should return init=false when re-running an already running job', async () => {
    const runner = new JobRunner(() => waitASec());
    const startStatus1 = runner.run();
    await waitASec(0.1);
    const startStatus2 = runner.run(); // wont start/init because already running
    expect(runner).toBeTruthy();
    expect(startStatus1.init).toBe(true);
    expect(startStatus1.running).toBe(true);
    expect(startStatus2.init).toBe(false);
    expect(startStatus2.running).toBe(true);
    expect(startStatus2.elapsedSec).toBeGreaterThan(startStatus1.elapsedSec ?? 0);
    expect(startStatus2.runtimeLeftInSec).toBeLessThan(startStatus1.runtimeLeftInSec ?? 0);
    expect(startStatus2.startedAt).toBe(startStatus1.startedAt);
  });

  it('should support `start` event', async () => {
    const runner = new JobRunner(() => waitASec());
    let started = false;
    let startStatus: IJobRunnerStatus | undefined;
    runner.on('start', (status) => {
      started = true;
      startStatus = status;
    });
    runner.run();
    expect(started).toBe(true);
    expect(startStatus).toBeDefined();
    expect(startStatus?.init).toBe(true);
  });

  it('should support `finish` event', async () => {
    const maxRuntimeInSec = 1;
    const runner = new JobRunner(() => waitASec(0.01), { maxRuntimeInSec });
    let finished = false;
    let finishStatus: IJobRunnerStatus | undefined;
    runner.on('finish', (status) => {
      finished = true;
      finishStatus = status;
    });
    runner.run();
    await waitASec(0.02);
    expect(finished).toBe(true);
    expect(finishStatus).toBeDefined();
    // should get status before resetted/stopped and therefor have these:
    expect(finishStatus?.startedAt).toBeDefined();
    expect(finishStatus?.running).toBe(true);
    expect(finishStatus?.elapsedSec).toBeGreaterThan(0);
    expect(finishStatus?.runtimeLeftInSec).toBeLessThan(maxRuntimeInSec);
  });

  it('should support `error` event', async () => {
    const maxRuntimeInSec = 1;
    const runner = new JobRunner(
      async () => {
        await waitASec(0.01);
        throw 'Chaos!';
      },
      { maxRuntimeInSec },
    );
    let error: any;
    let errorStatus: IJobRunnerStatus | undefined;
    runner.on('error', (err, status) => {
      error = err;
      errorStatus = status;
    });
    runner.run();
    await waitASec(0.02);
    expect(error).toBe('Chaos!');
    expect(errorStatus).toBeDefined();
    // should get status before resetted/stopped and therefor have these:
    expect(errorStatus?.startedAt).toBeDefined();
    expect(errorStatus?.running).toBe(true);
    expect(errorStatus?.elapsedSec).toBeGreaterThan(0);
    expect(errorStatus?.runtimeLeftInSec).toBeLessThan(maxRuntimeInSec);
  });

  it('should support `cancel` event', async () => {
    const maxRuntimeInSec = 1;
    const runner = new JobRunner(() => waitASec(0.02), { maxRuntimeInSec });
    let cancelled = false;
    let cancelStatus: IJobRunnerStatus | undefined;
    runner.on('cancel', (status) => {
      cancelled = true;
      cancelStatus = status;
    });
    runner.run();
    await waitASec(0.01);
    runner.cancel(); // running
    expect(cancelled).toBe(true);
    expect(cancelStatus).toBeDefined();
    // should get status before resetted/stopped and therefor have these:
    expect(cancelStatus?.startedAt).toBeDefined();
    expect(cancelStatus?.running).toBe(true);
    expect(cancelStatus?.elapsedSec).toBeGreaterThan(0);
    expect(cancelStatus?.runtimeLeftInSec).toBeLessThan(maxRuntimeInSec);
  });

  it('should not fire `finish` event if cancelled', async () => {
    const maxRuntimeInSec = 1;
    const runner = new JobRunner(() => waitASec(0.02), { maxRuntimeInSec });

    let cancelled = false;
    let finished = false;
    runner.on('cancel', () => (cancelled = true));
    runner.on('finish', () => (finished = true));

    runner.run();
    await waitASec(0.01);
    runner.cancel(); // running;
    await waitASec(0.02); // should've been finished if not cancelled

    expect(cancelled).toBe(true);
    expect(finished).toBe(false);
  });
});
