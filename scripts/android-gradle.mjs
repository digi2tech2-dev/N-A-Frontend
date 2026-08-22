import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

const task = process.argv[2] || 'assembleDebug';
const isWindows = process.platform === 'win32';
const projectRoot = path.resolve(import.meta.dirname, '..');
const androidDir = path.join(projectRoot, 'android');
const env = { ...process.env };

if (isWindows && !env.JAVA_HOME) {
  const androidStudioJbr = path.join(
    env.ProgramFiles || 'C:\\Program Files',
    'Android',
    'Android Studio',
    'jbr'
  );
  if (existsSync(path.join(androidStudioJbr, 'bin', 'java.exe'))) {
    env.JAVA_HOME = androidStudioJbr;
  }
}

if (isWindows && !env.ANDROID_HOME && env.LOCALAPPDATA) {
  const localSdk = path.join(env.LOCALAPPDATA, 'Android', 'Sdk');
  if (existsSync(localSdk)) env.ANDROID_HOME = localSdk;
}

const gradleCommand = isWindows ? 'gradlew.bat' : './gradlew';
const result = spawnSync(gradleCommand, [task, '--console=plain'], {
  cwd: androidDir,
  env,
  shell: isWindows,
  stdio: 'inherit',
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
