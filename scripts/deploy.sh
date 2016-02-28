#!/bin/sh

set -e

dirname=`dirname "$0"`
cd "$dirname/.."
echo "PHASE: Deploy..."

docker run \
  -e "ANSIBLE_VAULT_PASSWORD=$ANSIBLE_VAULT_PASSWORD" \
  -e "ANSIBLE_PLAYBOOK=containers.yml" \
  goabout/goabout-ansible
