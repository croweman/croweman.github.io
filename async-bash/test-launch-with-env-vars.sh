#!/bin/bash

export A=THE_A
export B=THE_B

# run in sub shell to ensure environment variables are passed through
(. ./run-scripts-in-parallel.sh script-one.sh script-two.sh script-three.sh)