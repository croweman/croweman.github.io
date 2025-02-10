#!/bin/bash
if [ ! -d ~/ctm-ami/ ]; then mkdir ~/ctm-ami; fi
if [ ! -f ~/ctm-ami/ami_info.json ]; then echo '{"source_ami_id":"","ami_id":"","eu-west-1":"","eu-central-1":"","us-east-1":"","ami_chain":""}' >> ~/ctm-ami/ami_info.json; fi
