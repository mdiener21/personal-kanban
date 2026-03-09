import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { notesFile: '.release-notes.md' };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--version') {
      args.version = argv[index + 1];
      index += 1;
      continue;
    }

    if (token === '--notes-file') {
      args.notesFile = argv[index + 1] ?? args.notesFile;
      index += 1;
      continue;
    }
  }

  return args;
}

function assertVersion(version) {
  if (!version || !/^(\d+)\.(\d+)\.(\d+)$/.test(version)) {
    throw new Error('Provide --version in X.Y.Z format.');
  }
}

function findReleaseBlock(changelogRaw, version) {
  const normalized = changelogRaw.replace(/\r\n/g, '\n');
  const releaseHeader = `## [${version}] - `;
  const start = normalized.indexOf(releaseHeader);

  if (start === -1) {
    throw new Error(`Could not find changelog section for version ${version}.`);
  }

  const nextStart = normalized.indexOf('\n## [', start + releaseHeader.length);
  const end = nextStart === -1 ? normalized.length : nextStart + 1;
  return normalized.slice(start, end).trimEnd();
}

function main() {
  const { version, notesFile } = parseArgs(process.argv.slice(2));
  assertVersion(version);

  const changelogPath = path.join(process.cwd(), 'CHANGELOG.md');
  const changelogRaw = fs.readFileSync(changelogPath, 'utf8');
  const releaseBlock = findReleaseBlock(changelogRaw, version);

  fs.writeFileSync(path.join(process.cwd(), notesFile), `${releaseBlock}\n`, 'utf8');
  process.stdout.write(version);
}

main();
