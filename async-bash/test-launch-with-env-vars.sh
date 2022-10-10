#!/bin/bash

export A=A_VALUE
export B=B_VALUE

# run in sub shell to ensure environment variables are passed through
./run-scripts-in-parallel.sh script-one.sh script-two.sh script-three.sh