import createNextIntlPlugin from 'next-intl/plugin';
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const withNextIntl = createNextIntlPlugin();

// Build-Zeit Commit-Hash und App-Version aufsammeln (rein lokal, kein Netz).
function readBuildCommit() {
  // Reihenfolge: Env-Variable (CI/CD), git rev-parse, fallback "unknown"
  const fromEnv = process.env.NEXT_PUBLIC_BUILD_COMMIT
    || process.env.CI_COMMIT_SHORT_SHA
    || process.env.GITHUB_SHA;
  if (fromEnv) return fromEnv.slice(0, 12);
  try {
    return execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim();
  } catch {
    return 'unknown';
  }
}

function readAppVersion() {
  try {
    const here = dirname(fileURLToPath(import.meta.url));
    const pkg = JSON.parse(readFileSync(join(here, 'package.json'), 'utf8'));
    return pkg.version || '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const BUILD_COMMIT = readBuildCommit();
const APP_VERSION = readAppVersion();

// Header ohne Betreiberbezug für alle Antworten. CSP und X-Frame-Options setzt
// proxy.ts zur Laufzeit (lib/sicherheits-header.ts).
const SECURITY_HEADERS = [
	{ key: 'X-Content-Type-Options', value: 'nosniff' },
	{ key: 'Referrer-Policy', value: 'no-referrer' },
	{ key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()' },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
	poweredByHeader: false,
	// Standalone-Ausgabe nur für den Docker-Build (NEXT_OUTPUT=standalone); lokal läuft `next start`.
	...(process.env.NEXT_OUTPUT === 'standalone' ? { output: 'standalone' } : {}),
	async headers() {
		return [{ source: '/:path*', headers: SECURITY_HEADERS }];
	},
	env: {
		NEXT_PUBLIC_BUILD_COMMIT: BUILD_COMMIT,
		NEXT_PUBLIC_APP_VERSION: APP_VERSION,
	},
	async redirects() {
		// Root → Default-Locale; ersetzt das frühere app/page.tsx, das unter Webpack
		// einen root layout verlangt hätte.
		return [
			{ source: '/', destination: '/de', permanent: false },
		];
	},
	// Vermeidet Webpack PackFileCache-Snapshot-Fehler unter Yarn 4, indem
	// die persistente Dateisystem-Cache-Nutzung deaktiviert wird
	webpack: (config, { dev }) => {
    // Nutzen wir einen In‑Memory‑Cache; stabil in Dev und CI
    config.cache = { type: 'memory' };
    return config;
  },
};

export default withNextIntl(nextConfig);
