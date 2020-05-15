#!/usr/bin/env node
import { echoChildProcessOutput } from 'child-process-toolbox';
import { execSync, spawn } from 'child_process';
import { program } from 'commander';
import { Writable } from 'stream';
import {version} from './package.json';

const containerName = 'fitbit-sim-starter';
const imageRepository = 'bingtimren/fitbit-simulator'
const imageTag='linux_wine_latest'
const image = imageRepository + ':' + imageTag
const launchCmd = ". /root/start.sh\n"

program
  .version(version)
  .option('-u, --update', 'update container by removing & re-pulling image')
  .option('-r, --reset','reset container')
  .option('-q, --quiet', `ignore simulator's output`)
  .parse(process.argv)

// test docker
try {
  const dockerVer = execSync('docker --version');
  console.log(dockerVer.toString());
} catch (error) {
  console.error('Running docker failed. Check if docker is installed.');
  process.exit(1);
}

// check image
try {
    execSync(`docker image ls ${image}|grep ${imageTag}`)
    if ( program.update ) {
      execSync(`docker image rm -f ${image}`)
      throw new Error("throw error to pull image")
    }
} catch (error) {
    console.log("Pulling simulator image from public repository, this may take some time")
    execSync(`docker image pull ${image}`, {stdio:"inherit"})
}

// check if container exists
try {
  execSync(`docker container inspect ${containerName}`, { stdio: 'ignore' });
  console.log(`Container ${containerName} exists.`);
  if (program.update || program.reset) {
    console.log(`Resetting (remove & recreate) container ${containerName}`)
    execSync(`docker container rm -f ${containerName}`)
    throw new Error("throw error to re-create container")
  }
} catch (error) {
  console.log(`Creating container ${containerName}.`);
  execSync(
    `docker container create \
        -it \
        --env="DISPLAY" \
        --env="QT_X11_NO_MITSHM=1" \
        --volume="/tmp/.X11-unix:/tmp/.X11-unix:rw" \
        --ipc="host" \
        --name ${containerName} \
        ${image}`,
    { stdio: 'inherit' }
  );
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
  console.log(`Authorizing container host ${containerHostname} with xhost`);
  execSync(`xhost +local:${containerHostname}`);

  // starting container
  console.log()
  console.log(`Starting container. You can press ctrl+c after start to return to the console.`);
  const container = spawn(`docker start -i -a ${containerId}`, {
    detached: true,
    shell: true,
    stdio: 'pipe',
    windowsHide: false
  });
  if ( !program.quiet ) {
    echoChildProcessOutput(container);
  }
  const containerInput: Writable = container.stdin as Writable;
  containerInput.write(launchCmd);
} catch (error) {
  console.error(`Unknown Error: ${error}`);
  process.exit(1);
}
