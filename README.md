# fitbit-sim-starter
Start Fitbit simulator in a docker container on Linux 

The starter launches a container from image "bingtimren/fitbit-simulator:linux_wine_latest". Dockerfile can be found here: https://github.com/bingtimren/fitbit-simulator-linux-wine-image. 

The image was inspired by rennomarcus's docker image https://github.com/rennomarcus/dockerimages/tree/master/fitbitos. Thank you Marcus! 

The starter launches the container properly and sets xhost to allow container uses the host's GUI.

To use, run `npx fitbit-sim-starter`

For more usage, see `npx fitbit-sim-starter -h`

## Issues

Sometimes the simulator times out and fails to load. You can press ctrl+c and run it again. You can also run `npx fitbit-sim-starter -r` to reset the container.