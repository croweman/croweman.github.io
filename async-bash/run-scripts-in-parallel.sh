#!/bin/bash

STAMP=$(date +%s)
PROGRESS=$(date +%s).sh
echo $PROGRESS
echo '#!/bin/bash' >> $PROGRESS
echo 'while sleep 2; do' >> $PROGRESS
echo '  if [[ ! -f '$STAMP'.txt ]]; then' >> $PROGRESS
echo '    exit 0' >> $PROGRESS
echo '  fi' >> $PROGRESS
echo '  echo -n "."' >> $PROGRESS
echo 'done' >> $PROGRESS
chmod +x $PROGRESS

function exiting {
  echo 'exiting'
  rm -f $PROGRESS
}
trap exiting EXIT

touch ./${STAMP}.txt
./${PROGRESS} &
PROGRESSPID=($!)

scripts=$@
echo scripts
echo $scripts
echo $$

for script in ${scripts[@]}; do
  echo $script
  ./${script} &
  PIDS+=($!)
done

# info message starting say what scripts are going to be ran, can i show progress
# looks like i can't do subshell and get pid back for dynamic
echo 'WE ARE STARTING'
date +%s



## wait for all processes to finish, and store each process's exit code into array STATUS[].
for pid in ${PIDS[@]}; do
  echo "pid=${pid}"
  wait ${pid}
  STATUS+=($?)
done

rm -f ./${STAMP}.txt
wait ${PROGRESSPID}

## after all processes are finished, check their exit codes in STATUS[].
i=0
for st in ${STATUS[@]}; do
  if [[ ${st} -ne 0 ]]; then
    echo "$i failed"
  else
    echo "$i finish"
  fi
  ((i+=1))
done

echo ''

# ADD NEW LINES BEFORE OUTPUTTING STUFF BECAUSE OF PROGRESS

# good example
# https://stackoverflow.com/questions/1570262/get-exit-code-of-a-background-process

# &> outputs error and standard out for log
#java -jar myProgram.jar &> output.log &

# starts with env vars!!!! sub shell
#(. ./script-one.sh &)
#(. ./script-two.sh &)

echo got here
# what scripts to run? what args?

# run scripts with env

# capture output to file then output it when done?

# MUST EXIT WHEN EVERYTHING COMPLETE

# when terminated should kill child processes




## start 3 child processes concurrently, and store each pid into array PIDS[].
#process=(a.sh b.sh c.sh)
#for app in ${process[@]}; do
#  ./${app} &
#  PIDS+=($!)
#done

## wait for all processes to finish, and store each process's exit code into array STATUS[].
#for pid in ${PIDS[@]}; do
#  echo "pid=${pid}"
#  wait ${pid}
#  STATUS+=($?)
#done
#
## after all processed finish, check their exit codes in STATUS[].
#i=0
#for st in ${STATUS[@]}; do
#  if [[ ${st} -ne 0 ]]; then
#    echo "$i failed"
#  else
#    echo "$i finish"
#  fi
#  ((i+=1))
#done