#!/bin/bash

STAMP=$(date +%s)
PROGRESS=$(date +%s).sh
echo '#!/bin/bash' >> $PROGRESS
echo 'while sleep 2; do' >> $PROGRESS
echo '  if [[ ! -f '$STAMP'.txt ]]; then' >> $PROGRESS
echo '    exit 0' >> $PROGRESS
echo '  fi' >> $PROGRESS
echo '  echo -n "."' >> $PROGRESS
echo 'done' >> $PROGRESS
chmod +x $PROGRESS

function exiting {
  echo 'Cleaning up'
  rm -f $PROGRESS
  rm -f ./${STAMP}.txt
  wait ${PROGRESSPID}

  for SCRIPT in ${SCRIPTS[@]}; do
    rm -f ${STAMP}-${SCRIPT}-output.txt &
  done
}
trap exiting EXIT

SCRIPTS=$@

echo '===================================='
echo 'Now running the following scripts in parallel'
echo '===================================='
for SCRIPT in ${SCRIPTS[@]}; do
  echo " - ${SCRIPT}"
  ./${SCRIPT} >> ${STAMP}-${SCRIPT}-output.txt &
  PIDS+=($!)
done

touch ./${STAMP}.txt
./${PROGRESS} &
PROGRESSPID=($!)

for PID in ${PIDS[@]}; do
  wait ${PID}
  STATUS+=($?)
done

rm -f ./${STAMP}.txt
wait ${PROGRESSPID}
echo

echo '===================================='
echo 'Scripts output'
echo '===================================='
for SCRIPT in ${SCRIPTS[@]}; do
  echo
  echo '===================================='
  echo "Script: ${SCRIPT}"
  echo '===================================='
  cat ${STAMP}-${SCRIPT}-output.txt
done

echo
echo '===================================='
echo 'Script execution results'
echo '===================================='
SCRIPTSARRAY=($SCRIPTS)
i=0
EXITCODE=0
for st in ${STATUS[@]}; do
  if [[ ${st} -ne 0 ]]; then
    EXITCODE=1
    echo " - ${SCRIPTSARRAY[i]}: failed"
  else
    echo " - ${SCRIPTSARRAY[i]}: successful"
  fi
  ((i+=1))
done

echo "exiting with exit code: ${EXITCODE}"
exit $EXITCODE
