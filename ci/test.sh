#/bin/bash

readonly command=$(basename ${0})

help(){
    echo "Usage: $command <subcommand> [options]\n"
    echo "Subcommands:"
    echo "    up"
    echo "    test"
    echo "    down"
    echo "Default behavior without a subcommand is up, test, down"
}

up(){
  docker build --platform linux/amd64 -f ci/indy-pool.dockerfile -t test_pool --build-arg pool_ip=10.0.0.2 ci
  docker network create --subnet=10.0.0.0/8 indy-sdk-network 2>/dev/null || true
  docker run -d --platform linux/amd64 --name indy_pool -p 9701-9708:9701-9708 --net=indy-sdk-network test_pool

  # Wait for all 4 nodes to reach participating state (up to 60s). Without
  # this, tests that write to the ledger (e.g. send_aml) race the pool's
  # startup/consensus election and fail or crash intermittently.
  echo "Waiting for pool nodes to reach participating state..."
  for i in $(seq 1 60); do
    count=$(docker exec indy_pool bash -c "grep -l 'participating' /var/log/indy/sandbox/Node*.log 2>/dev/null | wc -l" 2>/dev/null || echo 0)
    echo "  attempt $i: $count/4 nodes participating"
    if [ "$count" -ge "4" ]; then
      echo "Pool ready."
      break
    fi
    sleep 1
  done
}

run_tests(){
  cargo test  --manifest-path libindy_vdr/Cargo.toml --features local_nodes_pool
}

down(){
  docker stop indy_pool
  docker rm indy_pool
  docker network rm  indy-sdk-network
}

subcommand="$1"
case $subcommand in
  "-h" | "--help")
    help
    ;;
  "up")
    up
    ;;
  "test" | "tests")
    run_tests
    ;;
  "down")
    down
    ;;
  *)
    up
    run_tests
    down
    ;;
esac

