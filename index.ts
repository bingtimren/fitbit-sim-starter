#!/usr/bin/env node
import { echoChildProcessOutput } from 'child-process-toolbox';
import { execSync, spawn } from 'child_process';
import { program } from 'commander';
import { Writable } from 'stream';
import { version } from './package.json';

const launchCmd = '. /root/start.sh\n';

program
  .version(version)
  .option('-u, --update', 'update image by removing & re-pulling image')
  .option('-r, --reset', 'reset container')
  .option('-q, --quiet', `ignore simulator's output`)
  .option('-l, --lock', `prevent simulator upgrade`)
  .option(
    '-i, --image <docker-image>',
    'docker image',
    'bingtimren/fitbit-simulator:linux_wine_latest'
  )
  .parse(process.argv);

const image = program.image;
const addhost = program.lock
  ? ' --add-host simulator-updates.fitbit.com:127.0.0.1 '
  : ' ';

// test docker
try {
  const dockerVer = execSync('docker --version');
  console.log(dockerVer.toString());
} catch (error) {
  console.error('Running docker failed. Check if docker is installed.');
  process.exit(1);
}

// check image
console.log(`Docker image: ${image}`);
let imageId: string | undefined;
try {
  imageId = execSync(`docker image inspect -f '{{.Id}}' ${image}`).toString();
  if (program.update) {
    execSync(`docker image rm -f ${image}`);
    throw new Error('throw error to pull image');
  }
} catch (error) {
  console.log(
    'Pulling simulator image from public repository, this may take some time'
  );
  execSync(`docker image pull ${image}`, { stdio: 'inherit' });
  imageId = execSync(`docker image inspect -f '{{.Id}}' ${image}`).toString();
}
console.log(`Docker image ID: ${imageId}`);

// check if docker able to mount /tmp/.X11-unix
const volumeMountSuccess =
  parseInt(
    execSync(`docker run \
  --rm \
  --volume=/tmp/.X11-unix:/tmp/.X11-unix \
  --entrypoint="" \
  ${image} ls /tmp/.X11-unix \
  |grep -E "^X[0-9]+$"|wc -l`).toString(),
    undefined
  ) > 0;
const containerName = volumeMountSuccess
  ? 'fitbit-sim-starter-socket'
  : 'fitbit-sim-starter-network';

console.log(`Container: ${containerName}`);

// check if container exists
try {
  const containerImageId = execSync(
    `docker container inspect -f '{{.Image}}' ${containerName}`
  ).toString();
  console.log(
    `Container ${containerName} exists, launched with image ${containerImageId}.`
  );
  if (containerImageId !== imageId) {
    console.log(
      `Container ${containerName} was launched with a different image, reset.`
    );
  }
  if (program.update || program.reset || containerImageId !== imageId) {
    console.log(`Resetting (remove & recreate) container ${containerName}`);
    execSync(`docker container rm -f ${containerName}`);
    throw new Error('throw error to re-create container');
  }
} catch (error) {
  console.log(`Creating container ${containerName}.`);
  if (!volumeMountSuccess) {
    console.log(
      'Your docker cannot mount volume /tmp/.X11-unix, uses host network'
    );
    execSync(
      `docker container create \
          -it \
          --net=host \
          --env="DISPLAY" \
          ${addhost} \
          --env="QT_X11_NO_MITSHM=1" \
          --volume="$HOME/.Xauthority:/root/.Xauthority:ro" \
          --ipc="host" \
          --name ${containerName} \
          ${image}`,
      { stdio: 'inherit' }
    );
  } else {
    execSync(
      `docker container create \
          -it \
          --env="DISPLAY" \
          --env="QT_X11_NO_MITSHM=1" \
          ${addhost} \
          --volume="/tmp/.X11-unix:/tmp/.X11-unix:rw" \
          --ipc="host" \
          --name ${containerName} \
          ${image}`,
      { stdio: 'inherit' }
    );
  }
}

// inspect container
try {
  const containerId = execSync(`docker ps -a -f NAME=${containerName} -q`)
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
  if (containerStatus === 'running') {
    console.log('Stopping currently running container');
    execSync(`docker container stop ${containerName}`);
  }
  console.log(`Authorizing container host ${containerHostname} with xhost`);
  execSync(`xhost +local:${containerHostname}`);

  // starting container
  console.log();
  console.log(
    `Starting container. You can press ctrl+c after start to return to the console.`
  );
  const container = spawn(`docker start -i -a ${containerId}`, {
    detached: true,
    shell: true,
    stdio: 'pipe',
    windowsHide: false
  });
  if (!program.quiet) {
    echoChildProcessOutput(container);
  }
  const containerInput: Writable = container.stdin as Writable;
  containerInput.write(launchCmd);
} catch (error) {
  console.error(`Unknown Error: ${error}`);
  process.exit(1);
}
