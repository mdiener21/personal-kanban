import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const args = { bump: 'patch', notesFile: '.release-notes.md' };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--bump') {
      args.bump = argv[index + 1] ?? args.bump;
      index += 1;
      continue;
    }

    if (token === '--notes-file') {
      args.notesFile = argv[index + 1] ?? args.notesFile;
      index += 1;
      continue;
    }

    if (token === '--date') {
      args.date = argv[index + 1];
      index += 1;
      continue;
    }
  }

  return args;
}

function assertSupportedBumpType(bump) {
  if (!['patch', 'minor', 'major'].includes(bump)) {
    throw new Error(`Unsupported bump type "${bump}". Use patch|minor|major.`);
  }
}

function bumpVersion(version, bump) {
  const match = version.match(/^(\d+)\.(\d+)\.(\d+)$/);
  if (!match) {
    throw new Error(`Invalid semantic version "${version}" in package.json.`);
  }

  const major = Number(match[1]);
  const minor = Number(match[2]);
  const patch = Number(match[3]);

  if (bump === 'major') return `${major + 1}.0.0`;
  if (bump === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${patch + 1}`;
}

function normalizeSectionBody(body) {
  if (!body) return '';
  return body
    .replace(/^\n+/, '')
    .replace(/\s+$/, '')
    .replace(/\r\n/g, '\n');
}

function extractSectionBody(unreleasedBlock, sectionName) {
  const heading = `### ${sectionName} (unreleased)`;
  const start = unreleasedBlock.indexOf(heading);
  if (start === -1) {
    return '';
  }

  const contentStart = start + heading.length;
  const followingHeadings = [
    '### Added (unreleased)',
    '### Changed (unreleased)',
    '### Removed (unreleased)'
  ]
    .map((candidate) => unreleasedBlock.indexOf(candidate, contentStart))
    .filter((position) => position !== -1)
    .sort((a, b) => a - b);

  const contentEnd = followingHeadings.length > 0 ? followingHeadings[0] : unreleasedBlock.length;
  const rawBody = unreleasedBlock.slice(contentStart, contentEnd);

  return normalizeSectionBody(rawBody);
}

function hasBulletContent(value) {
  return /^\s*-\s+/m.test(value || '');
}

function buildReleaseSection(name, version, body) {
  const heading = `### ${name} (${version})`;
  if (!body) {
    return `${heading}\n`;
  }

  return `${heading}\n\n${body}\n`;
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function updateChangelog(changelogPath, version, dateIso, notesFilePath) {
  const changelogRaw = fs.readFileSync(changelogPath, 'utf8').replace(/\r\n/g, '\n');
  const unreleasedHeader = '## Unreleased';
  const unreleasedStart = changelogRaw.indexOf(unreleasedHeader);

  if (unreleasedStart === -1) {
    throw new Error('CHANGELOG.md is missing the "## Unreleased" section.');
  }

  const nextReleaseHeaderIndex = changelogRaw.indexOf('\n## [', unreleasedStart + unreleasedHeader.length);
  const unreleasedEnd = nextReleaseHeaderIndex === -1 ? changelogRaw.length : nextReleaseHeaderIndex + 1;

  const before = changelogRaw.slice(0, unreleasedStart);
  const unreleasedBlock = changelogRaw.slice(unreleasedStart, unreleasedEnd).trimEnd();
  const after = changelogRaw.slice(unreleasedEnd);

  const addedBody = extractSectionBody(unreleasedBlock, 'Added');
  const changedBody = extractSectionBody(unreleasedBlock, 'Changed');
  const removedBody = extractSectionBody(unreleasedBlock, 'Removed');

  if (![addedBody, changedBody, removedBody].some((value) => hasBulletContent(value))) {
    throw new Error('Unreleased changelog has no bullet entries to release.');
  }

  const releaseSections = [
    buildReleaseSection('Added', version, addedBody),
    buildReleaseSection('Changed', version, changedBody),
    buildReleaseSection('Removed', version, removedBody)
  ].join('\n');

  const newReleaseBlock = [
    `## [${version}] - ${dateIso}`,
    '',
    releaseSections.trimEnd()
  ].join('\n');

  const resetUnreleasedBlock = [
    '## Unreleased',
    '',
    '### Added (unreleased)',
    '',
    '### Changed (unreleased)',
    '',
    '### Removed (unreleased)',
    ''
  ].join('\n');

  const updatedChangelog = `${before}${resetUnreleasedBlock}\n${newReleaseBlock}\n\n${after.replace(/^\n+/, '')}`;
  fs.writeFileSync(changelogPath, updatedChangelog, 'utf8');

  const releaseNotes = [
    `## ${version} - ${dateIso}`,
    '',
    buildReleaseSection('Added', version, addedBody).trimEnd(),
    '',
    buildReleaseSection('Changed', version, changedBody).trimEnd(),
    '',
    buildReleaseSection('Removed', version, removedBody).trimEnd(),
    ''
  ].join('\n');

  fs.writeFileSync(notesFilePath, releaseNotes, 'utf8');
}

function updatePackageVersion(packageJsonPath, nextVersion) {
  const packageRaw = fs.readFileSync(packageJsonPath, 'utf8');
  const packageJson = JSON.parse(packageRaw);
  packageJson.version = nextVersion;
  fs.writeFileSync(packageJsonPath, `${JSON.stringify(packageJson, null, 2)}\n`, 'utf8');
}

function main() {
  const { bump, notesFile, date } = parseArgs(process.argv.slice(2));
  assertSupportedBumpType(bump);

  const cwd = process.cwd();
  const packageJsonPath = path.join(cwd, 'package.json');
  const changelogPath = path.join(cwd, 'CHANGELOG.md');
  const notesFilePath = path.join(cwd, notesFile);

  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const currentVersion = packageJson.version;
  const nextVersion = bumpVersion(currentVersion, bump);

  updatePackageVersion(packageJsonPath, nextVersion);
  updateChangelog(changelogPath, nextVersion, date || todayIsoDate(), notesFilePath);

  process.stdout.write(`${nextVersion}`);
}

main();
