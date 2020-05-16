# fitbit-sim-starter
Start Fitbit simulator with wine in a docker container on Linux 

The starter launches a container from image "bingtimren/fitbit-simulator:linux_wine_latest". Dockerfile can be found here: https://github.com/bingtimren/fitbit-simulator-linux-wine-image. 

The image was inspired by rennomarcus's docker image https://github.com/rennomarcus/dockerimages/tree/master/fitbitos. Thank you Marcus! 

The starter launches the container with necessary settings and sets xhost to allow container uses the host's GUI.

To use, run `npx fitbit-sim-starter`

By default the container connects to the host's X server via a socket connection. However, some docker installations are built to limit file access to $HOME (VirtualBox, boot2docker, Docker installed from snap https://snapcraft.io/docker), not allowing containers to access the socket. In this case, the starter launches the container to use the host's network stack.

After simulater starts up, you can press ctrl+c to return to console.

For more usage, see `npx fitbit-sim-starter -h`

## Issues

Sometimes the simulator times out and fails to load. You can press ctrl+c and run it again. You can also run `npx fitbit-sim-starter -r` to reset the container.

You may want to be able to run docker commands without sudo, see https://github.com/sindresorhus/guides/blob/master/docker-without-sudo.md
