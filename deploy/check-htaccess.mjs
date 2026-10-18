// Check build/.htaccess with a throwaway local Apache before deploying.
//
// A broken .htaccess turns the whole site into "500 Internal Server Error", and
// nothing on the way to the server would notice. So this script starts Apache on
// a free local port – with the same settings as deploy/apache-vhost.conf – serves
// build/ and asks a few URLs. No request leaves this machine.
//
// Needs Apache 2.4 locally (Debian/Ubuntu: apt install apache2; it does not have
// to run as a service). Other systems: set APACHE_BIN and APACHE_MODULES.
//
// Usage: node deploy/check-htaccess.mjs   (run by deploy/deploy.sh after the build)

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const BUILD = resolve(import.meta.dirname, '../build');
const APACHE_BIN = process.env.APACHE_BIN ?? '/usr/sbin/apache2';
const MODULES = process.env.APACHE_MODULES ?? '/usr/lib/apache2/modules';

/** [path, expected HTTP status, what it shows] */
const CHECKS = [
	['/', 200, 'app shell'],
	['/einheit/test', 200, 'app routes get the app shell'],
	['/manifest.webmanifest', 200, 'static files'],
	['/_app/immutable/missing.js', 404, 'missing build files stay 404'],
	['/proxy/ccbuchner/agb/c-856', 403, 'proxy only for the two allowed URL patterns'],
	['/.htaccess', 403, 'server configuration is not served']
];

let apache;
const dir = mkdtempSync(join(tmpdir(), 'vokabulator-htaccess-'));
try {
	if (!existsSync(join(BUILD, '.htaccess')))
		fail('build/.htaccess is missing – run `pnpm build` first.');
	if (!existsSync(APACHE_BIN)) {
		fail(`Apache not found at ${APACHE_BIN}. Install it (apt install apache2) or set APACHE_BIN.`);
	}

	const port = await freePort();
	const config = join(dir, 'httpd.conf');
	writeFileSync(config, apacheConfig(dir, port));

	const syntax = spawnSync(APACHE_BIN, ['-t', '-f', config], { encoding: 'utf8' });
	if (syntax.status !== 0) fail(`Apache test config is broken:\n${syntax.stderr}`);

	apache = spawn(APACHE_BIN, ['-f', config, '-DFOREGROUND'], { stdio: 'ignore' });
	await waitUntilUp(port);

	let failed = 0;
	for (const [path, expected, what] of CHECKS) {
		const response = await fetch(`http://127.0.0.1:${port}${path}`, { redirect: 'manual' });
		const ok = response.status === expected;
		if (!ok) failed++;
		console.log(`${ok ? '✅' : '❌'} ${path} → ${response.status} (expected ${expected}: ${what})`);
	}

	if (failed > 0) {
		const log = readFileSync(join(dir, 'error.log'), 'utf8')
			.trim()
			.split('\n')
			.slice(-10)
			.join('\n');
		fail(`.htaccess check failed. Last lines of the Apache error log:\n${log}`);
	}
	console.log('✅ .htaccess ok');
} catch (error) {
	console.error(`❌ ${/** @type {Error} */ (error).message}`);
	process.exitCode = 1;
} finally {
	apache?.kill('SIGTERM');
	rmSync(dir, { recursive: true, force: true });
}

/**
 * Same modules and settings as deploy/apache-vhost.conf, minus TLS for the site itself.
 * @param {string} dir
 * @param {number} port
 */
function apacheConfig(dir, port) {
	const modules = [
		'mpm_event',
		'authz_core',
		'authz_host',
		'mime',
		'dir',
		'autoindex',
		'rewrite',
		'headers',
		'proxy',
		'proxy_http',
		'ssl'
	];
	return `
ServerRoot ${dir}
ServerName localhost
Listen 127.0.0.1:${port}
PidFile ${dir}/httpd.pid
ErrorLog ${dir}/error.log
${modules.map((m) => `LoadModule ${m}_module ${MODULES}/mod_${m}.so`).join('\n')}
${existsSync('/etc/mime.types') ? 'TypesConfig /etc/mime.types' : ''}

# like the default server config: no access outside the site, never serve .ht* files
<Directory />
	AllowOverride None
	Require all denied
</Directory>
<FilesMatch "^\\.ht">
	Require all denied
</FilesMatch>

# as in deploy/apache-vhost.conf
DocumentRoot ${BUILD}
<Directory ${BUILD}>
	Require all granted
	AllowOverride All
</Directory>
SSLProxyEngine on
ProxyAddHeaders Off
`;
}

/** @returns {Promise<number>} a TCP port that is free right now */
function freePort() {
	return new Promise((resolvePort) => {
		const server = createServer().listen(0, '127.0.0.1', () => {
			const { port } = /** @type {import('node:net').AddressInfo} */ (server.address());
			server.close(() => resolvePort(port));
		});
	});
}

/** @param {number} port */
async function waitUntilUp(port) {
	for (let i = 0; i < 50; i++) {
		try {
			await fetch(`http://127.0.0.1:${port}/`);
			return;
		} catch {
			await new Promise((r) => setTimeout(r, 100));
		}
	}
	fail('Apache did not start within 5 seconds.');
}

/** @param {string} message */
function fail(message) {
	throw new Error(message);
}
