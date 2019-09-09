/*
    Yaroslav Gaponov yaroslav.gaponov@gmail.com
*/

const EOL = require('os').EOL;
const exec = require('child_process').exec;
const {
    Writable,
    Readable,
    Transform
} = require('stream');

const GIT_CMD = 'git log --oneline --no-color';

class GitCommitReader extends Readable {

    constructor(opt = {}) {
        super({
            objectMode: true
        });

        this._filter = opt.filter;
        this._pattern = opt.pattern;
        this._fields = opt.fields;
    }

    _read() {
        exec(GIT_CMD,
                (error, stdout, stderr) => {
                    stdout
                        .split(EOL)
                        .filter(line => line.length > 8)
                        .map(line => ({
                            hash: line.substr(0, 7),
                            subject: line.substr(8)
                        }))
                        .filter(commit => !this._filter || this._filter.test(commit.subject))
                        .map(commit => {
                            if (this._pattern && this._fields && this._pattern.test(commit.subject)) {
                                const match = this._pattern.exec(commit.subject);
                                for (let i = 0; i < this._fields.length; i++) {
                                    if (this._fields[i]) {
                                        commit[this._fields[i]] = match[i + 1];
                                    }
                                }
                            }
                            return commit;
                        })
                        .forEach(this.push.bind(this));
                })
            .once('close', _ => this.push(null));
    }
}

class FormatStream extends Transform {
    constructor() {
        super({
            objectMode: true
        });

        this._version = 'Not released yet';
        this._commits = {};
    }

    _transform(commit, encoding, callback) {
        if (commit.type === 'chore' && commit.scope === 'release') {
            if (Object.keys(this._commits).length > 0) {
                this.push({
                    version: this._version,
                    commits: this._commits
                });
            }
            this._version = commit.message;
            this._commits = {};
        } else {
            if (this._commits[commit.type]) {
                this._commits[commit.type].push(commit);
            } else {
                this._commits[commit.type] = [commit];
            }
        }
        callback();
    }

    _flush(callback) {
        if (Object.keys(this._commits).length > 0) {
            this.push({
                version: this._version,
                commits: this._commits
            });
        }
        callback();
    }
}

const TYPE = Object.freeze({
    chore: 'Build process or auxiliary tool changes',
    ci: 'Continuous Integration',
    docs: 'Documentation',
    feat: 'Features',
    fix: 'Bug Fixes',
    perf: 'Performance Improvements',
    refactor: 'Code Refactoring',
    release: 'Features',
    style: 'Styles',
    test: 'Tests',
    build: 'Build System'
});

class PrintStream extends Writable {
    constructor() {
        super({
            objectMode: true
        });
        console.log('# Changelog\n');
    }
    _write(data, encoding, callback) {
        console.log(`## Release: ${data.version}\n`);
        for (let type in data.commits) {
            console.log(`### ${TYPE[type]||type}`);
            for (let i = 0; i < data.commits[type].length; i++) {
                const line = ['*'];
                if (data.commits[type][i].scope) line.push(`[${data.commits[type][i].scope}]`);
                line.push(data.commits[type][i].message);
                line.push(`[${data.commits[type][i].hash}]`);
                console.log(line.join(' '));
            }
            console.log('\n');
        }
        callback();
    }
}

if (!module.parent) {
    const opts = {
        filter: /^(\w*)(?:\((.*)\))?:\s*(.*)$/,
        pattern: /^(\w*)(?:\((.*)\))?:\s*(.*)$/,
        fields: ['type', 'scope', 'message']
    };

    (new GitCommitReader(opts)).pipe(new FormatStream()).pipe(new PrintStream());
} else {
    module.exports = opts => (new GitCommitReader(opts)).pipe(new FormatStream()).pipe(new PrintStream());
}