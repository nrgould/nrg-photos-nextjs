# Node.js runtime

Use Node.js 24 LTS for local development, CI, and deployment. The repository's
`.nvmrc`, `.node-version`, `package.json` engines, and verification workflow all
select the Node 24 release line. Vercel is configured for Node 24.x.

With nvm loaded, select the runtime from the repository root:

```sh
nvm install
nvm use
node -p 'JSON.stringify({version: process.version, arch: process.arch, execPath: process.execPath})'
npm --version
npm ci --no-audit --no-fund
```

Use the npm bundled with Node 24 and the existing `package-lock.json`. Runtime
selection does not require dependency upgrades. The version selectors track the
24 release line so patch updates do not require changing repository configuration.

## Existing Apple Silicon installation

The verified installation on Nicholas's Mac is Node v24.20.0 (darwin/arm64), with
npm 11.19.0, at `/Users/nicholas/.nvm/versions/node/v24.20.0/bin/node`.
The shell may otherwise select the Intel Node v23.5.0 at `/usr/local/bin/node`.
For a command or integration-test shell, select the existing native runtime with:

```sh
export PATH="/Users/nicholas/.nvm/versions/node/v24.20.0/bin:$PATH"
node -p 'JSON.stringify({version: process.version, arch: process.arch, execPath: process.execPath})'
npm --version
```

No global Node installation or shell-profile change is required. The absolute
path above is specific to this Mac; other machines should use a version manager.

When switching from Intel/Rosetta Node to native ARM64, existing `node_modules`
may contain binaries for the old architecture. For example, tsx cannot start
when esbuild only has `@esbuild/darwin-x64` installed. Stop processes using the
shared dependency tree, select native Node 24, then run `npm ci --no-audit
--no-fund` to install the locked dependencies for the correct architecture before
running the checks.

## Verification

After selecting Node 24, run the repository checks:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

With the production server running on the verification script's expected port,
run `node scripts/verify-ssr.mjs`. Coordinate builds and server runs when sharing
this checkout, since they use the same `.next` output directory.
