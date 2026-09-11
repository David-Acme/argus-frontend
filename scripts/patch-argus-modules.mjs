import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..');
const settingsPath = join(root, 'android', 'settings.gradle');
const appGradlePath = join(root, 'android', 'app', 'build.gradle');
const mainApplicationPath = join(
  root,
  'android',
  'app',
  'src',
  'main',
  'java',
  'com',
  'davidacme',
  'argus',
  'MainApplication.kt',
);

const modules = [
  { name: 'argus-net', className: 'ArgusNetPackage', packagePath: 'com.margelo.nitro.net', manual: false },
  { name: 'argus-mic', className: 'ArgusMicPackage', packagePath: 'com.margelo.nitro.mic', manual: true },
  { name: 'argus-face', className: 'ArgusFacePackage', packagePath: 'com.margelo.nitro.face', manual: true },
  { name: 'argus-camera', className: 'ArgusCameraPackage', packagePath: 'com.margelo.nitro.camera', manual: true },
];

if (existsSync(settingsPath)) {
  let settings = readFileSync(settingsPath, 'utf8');
  for (const module of modules) {
    if (settings.includes(`include ':${module.name}'`)) continue;
    settings += `include ':${module.name}'\nproject(':${module.name}').projectDir = new File(rootProject.projectDir, '../node_modules/${module.name}/android')\n`;
  }
  writeFileSync(settingsPath, settings);
} else {
  process.exit(0);
}

if (existsSync(appGradlePath)) {
  let appGradle = readFileSync(appGradlePath, 'utf8');
  for (const module of modules) {
    if (appGradle.includes(`project(':${module.name}')`)) continue;
    appGradle = appGradle.replace(
      'dependencies {',
      `dependencies {\n    implementation project(':${module.name}')`,
    );
  }
  writeFileSync(appGradlePath, appGradle);
}

if (existsSync(mainApplicationPath)) {
  let mainApplication = readFileSync(mainApplicationPath, 'utf8');
  for (const module of modules) {
    if (!module.manual) continue;
    if (!mainApplication.includes(`${module.className}()`)) {
      if (!mainApplication.includes(`import ${module.packagePath}.${module.className}`)) {
        mainApplication = mainApplication.replace(
          'import com.facebook.react.ReactPackage',
          `import com.facebook.react.ReactPackage\nimport ${module.packagePath}.${module.className}`,
        );
      }
      mainApplication = mainApplication.replace(
        'PackageList(this).packages.apply {',
        `PackageList(this).packages.apply {\n          add(${module.className}())`,
      );
    }
  }
  writeFileSync(mainApplicationPath, mainApplication);
}

console.log('argus nitro modules patched into the android project');
