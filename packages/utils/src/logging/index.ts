/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-empty-function */

type LogInput = Record<string, unknown> & { msg: string };
export type LoggerFuncs = {
    trace(obj: LogInput): void;
    debug(obj: LogInput): void;
    info(obj: LogInput): void;
    warn(obj: LogInput): void;
    error(obj: LogInput): void;
};

export class Logger {
    public readonly namespace: string;
    public readonly trace: (obj: LogInput) => void;
    public readonly debug: (obj: LogInput) => void;
    public readonly info: (obj: LogInput) => void;
    public readonly warn: (obj: LogInput) => void;
    public readonly error: (obj: LogInput) => void;

    constructor(options: { namespace: string; logger?: LoggerFuncs | Logger | undefined | null }) {
        this.namespace =
            options.logger instanceof Logger ? options.logger?.namespace + '_' + options.namespace : options.namespace;

        this.trace =
            typeof options?.logger?.trace != 'function'
                ? (obj: LogInput) => {}
                : this.wrapLog(this.namespace, options.logger.trace.bind(options.logger));

        this.debug =
            typeof options?.logger?.debug != 'function'
                ? (obj: LogInput) => {}
                : this.wrapLog(this.namespace, options.logger.debug.bind(options.logger));

        this.info =
            typeof options?.logger?.info != 'function'
                ? (obj: LogInput) => {}
                : this.wrapLog(this.namespace, options.logger.info.bind(options.logger));

        this.warn =
            typeof options?.logger?.warn != 'function'
                ? (obj: LogInput) => {}
                : this.wrapLog(this.namespace, options.logger.warn.bind(options.logger));

        this.error =
            typeof options?.logger?.error != 'function'
                ? (obj: LogInput) => {}
                : this.wrapLog(this.namespace, options.logger.error.bind(options.logger));
    }

    private wrapLog(namespace: string, logFunc: (obj: LogInput) => void): (obj: LogInput) => void {
        return (obj: LogInput) => {
            logFunc({
                __logNamespace: namespace,
                ...obj,
            });
        };
    }
}
