import express from 'express';
import { TypedEmitter } from 'tiny-typed-emitter';

export interface IJobRunnerOptions {
  maxRuntimeInSec: number;
  onCancel?: () => unknown;
  statusInfo?: unknown;
}

export interface IJobRunnerStatus {
  init?: boolean;
  running: boolean;
  maxRuntimeInSec: number;
  runtimeLeftInSec?: number;
  startedAt?: number;
  elapsedSec?: number;
  info?: unknown;
}

export interface IJobRunnerEvents {
  start: (status: IJobRunnerStatus, job: JobRunner) => void;
  finish: (status: IJobRunnerStatus, job: JobRunner) => void;
  cancel: (status: IJobRunnerStatus, job: JobRunner) => void;
  error: (err: any, status: IJobRunnerStatus, job: JobRunner) => void;
}

export class JobRunner extends TypedEmitter<IJobRunnerEvents> {
  private startedAt: number | undefined;
  private options: IJobRunnerOptions;

  static defaultOptions: IJobRunnerOptions = {
    maxRuntimeInSec: 60,
  };

  constructor(private jobFn: () => unknown | Promise<unknown>, options?: Partial<IJobRunnerOptions>) {
    super();
    this.options = Object.assign({}, JobRunner.defaultOptions, options || {});
  }

  status(now = Date.now()): IJobRunnerStatus {
    const elapsedSec = this.startedAt && (now - this.startedAt) / 1000;
    const info = this.options.statusInfo;
    return {
      init: false,
      running: !!this.startedAt,
      startedAt: this.startedAt,
      elapsedSec,
      maxRuntimeInSec: this.options.maxRuntimeInSec,
      runtimeLeftInSec: this.runtimeLeftInSec,
      info,
    };
  }

  run(): IJobRunnerStatus {
    if (this.isRunning) {
      return this.status();
    }
    if (!this.hasRuntime) {
      this.cancel();
    }
    this.startedAt = Date.now();
    const statusWhenStarted = { ...this.status(), init: true };
    this.emit('start', statusWhenStarted, this);
    (async () => {
      try {
        await this.jobFn();
        this.finish();
      } catch (err) {
        this.error(err);
      }
    })();
    return statusWhenStarted;
  }

  private reset() {
    this.startedAt = undefined;
  }

  /**
   * Use to manually set the job to finished (and trigger `finish` event)
   * Do note! This won't cancel the actually job promise, only resetting JobRunner instance.
   **/
  finish() {
    const statusWhenFinished = this.status();
    const shouldEmit = !!this.startedAt;
    this.reset();
    if (shouldEmit) {
      this.emit('finish', statusWhenFinished, this);
    }
    return statusWhenFinished;
  }

  cancel(): void {
    const statusWhenCancelled = this.status();
    const canCancel = !!this.startedAt;
    this.reset();
    if (canCancel) {
      this.emit('cancel', statusWhenCancelled, this);
    }
  }

  private error(err: unknown): void {
    const statusWhenErrored = this.status();
    this.reset();
    this.emit('error', err, statusWhenErrored, this);
  }

  get isRunning(): boolean {
    return !!(this.startedAt && this.hasRuntime);
  }

  get runtimeLeftInSec(): number {
    const start = this.startedAt || Date.now();
    return this.options.maxRuntimeInSec - (Date.now() - start) / 1000;
  }

  get hasRuntime(): boolean {
    return this.runtimeLeftInSec > 0;
  }

  getRouter(router: express.Router): express.Router {
    router.get('/status', (_, res) => res.json(this.status()));
    router.get('/run', (_, res) => res.json(this.run()));
    router.get('/cancel', (_, res) => res.json(this.cancel()));
    return router;
  }
}
