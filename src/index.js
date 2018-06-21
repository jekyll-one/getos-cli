#!/usr/bin/env node
'use strict';

var npmlog = require('npmlog');
const meow = require('meow');
var getos = require('getos')

const packageJson = require('./package.json');

const options = ['n', 'name', 'version', 'help'];
const help = `Usage: getos [OPTION]

By default, getos tries to create hard links, if this fails for a TARGET
because it is a directory getos tries to create a directory junction
(symbolic link on modern OSs) for this TARGET.

Options:
    -n, --name       Print the name of the current OS
    --version        Display version information
    --help           Show help

Report getos bugs to ${packageJson.bugs.url}
getos home page: ${packageJson.homepage}
`;

const scanArgv = argv => meow({
	argv,
	help
}, {
	alias: {
		n: 'name',
	},
	boolean: [
		'name'
	]
});

const parseLinkType = flags => {
	const types = getos.getTypes().filter(t => flags[t]);

	switch (types.length) {
		case 0:
			return 'default';
		case 1:
			return types[0];
		default:
			throw new Error('cannot combine --' + types[0] + ' and --' + types[1]);
	}
};

const parseLogger = flags => {
	npmlog.level = 'info';
	if (flags.debug) {
		npmlog.level = 'silly';
	}	else if (flags.verbose) {
		npmlog.level = 'verbose';
	}

	return npmlog.log.bind(npmlog);
};

const parseFlags = flags => {
	Object.keys(flags).forEach(flag => {
		if (options.indexOf(flag) === -1) {
			throw new Error(`Unknown argument: --${flag}`);
		}
	});

	const opts = flags;
	opts.type = parseLinkType(flags);
	opts.log = parseLogger(flags);

	return {opts};
};

const parseInput = input => {
	const inputLen = input.length;

	return {
		directory: inputLen > 1 ? input.slice(-1)[0] : undefined,
		targets: inputLen > 0 ? input.slice(0, -1) : undefined
	};
};

const parseArgv = argv => {
	const cli = scanArgv(argv);

	return Object.assign(parseFlags(cli.flags), parseInput(cli.input));
};

const main = argv => Promise.resolve(argv)
	.then(argv => {
		npmlog.log('silly', 'getos', 'argv: %j', argv);
		const cmd = parseArgv(argv);
		npmlog.log('silly', 'getos', 'cmd: %j', cmd);

		return getos(cmd.targets, cmd.directory, cmd.opts);
	})
	.catch(err => {
		if (npmlog.level === 'silly') {
			npmlog.log('error', 'getos', err);
		} else {
			npmlog.log('error', 'getos', err.message);
		}

		// force info
		const logLevel = npmlog.level;
		npmlog.level = 'info';
		npmlog.log('info', 'getos', 'Try `getos --help` for more information');
		npmlog.level = logLevel;

		npmlog.log('verbose', 'getos', `getos@${packageJson.version}`, __filename);

		throw err;
	})
	.then(() => 0, () => 1);

module.exports = main;

if (require.main === module) {
	main(process.argv.slice(2)).then(status => process.exit(status));
}
