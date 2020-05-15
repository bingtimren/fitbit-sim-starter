#!/usr/bin/env node
import { echoChildProcessOutput } from 'child-process-toolbox';
import { execSync, spawn } from 'child_process';
import { Writable } from 'stream';

const containerName = 'fitbit-sim-starter';

// test docker
try {
  const dockerVer = execSync('docker --version');
  console.log(dockerVer.toString());
} catch (error) {
  console.error('Running docker failed. Check if docker is installed.');
  process.exit(1);
}

// check if container exists
try {
  execSync(`docker container inspect ${containerName}`, { stdio: 'ignore' });
  console.log(`Container ${containerName} exists.`);
} catch (error) {
  console.log(`Creating container ${containerName}, it may take some time.`);
  execSync(
    `docker container create \
        -it \
        --env="DISPLAY" \
        --env="QT_X11_NO_MITSHM=1" \
        --volume="/tmp/.X11-unix:/tmp/.X11-unix:rw" \
        --ipc="host" \
        --name ${containerName} \
        bingtimren/fitbit-simulator:linux_wine_latest`,
    { stdio: 'inherit' }
  );
}

// inspect container
try {
  const containerId = execSync(`docker ps -a -f NAME=$CONTAINER_NAME -q`)
    .toString()
    .trim();
  const containerStatus = execSync(
    `docker container inspect --format='{{ .State.Status }}' ${containerName}`
  )
    .toString()
    .trim();
  const containerHostname = execSync(
    `docker inspect --format='{{ .Config.Hostname }}' ${containerName}`
  )
    .toString()
    .trim();
  console.log(
    `Container id=${containerId}, status=${containerStatus}, hostname=${containerHostname}`
  );
  console.log(`Authorizing container host ${containerHostname} with xhost`);
  execSync(`xhost +local:${containerHostname}`);

  // starting container
  console.log(`Starting container`);
  const container = spawn(`docker start -i -a ${containerId}`, {
    detached: true,
    shell: true,
    stdio: 'pipe',
    windowsHide: false
  });
  echoChildProcessOutput(container);
  const containerInput: Writable = container.stdin as Writable;
  containerInput.write('wine fitbitos.exe\n');
} catch (error) {
  console.error(`Unknown Error: ${error}`);
  process.exit(1);
}
