class LogState {

    constructor() {
        this.msg = '';
        this.exists = new LogTime();
        this.upload = new LogTime();
        this.save = new LogTime();
        this.download = new LogTime();
        this.play = new LogTime();
        this.delete = new LogTime();
    }

    toString() {
        return "["+Object.keys(this).map(a => (a + ": " + this[a].toString())).join(', ')+"]";
    }

}

class LogTime {
    constructor() {
        this.internalTime = 0;
        this.timeTaken = 0;
    }

    start() {
        this.internalTime = new Date().getTime();
    }

    stop() {
        this.timeTaken = new Date().getTime() - this.internalTime;
    }

    toString() {
        if (this.internalTime == 0)
            return 'Not Recorded';
        if (this.timeTaken == 0)
            return 'Timer still running';
        return this.timeTaken + 'ms';
    }

    getTime() {
        return this.timeTaken;
    }

    toJSON() {
        return this.getTime();
    }
}

module.exports = {LogState};