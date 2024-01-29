export CONNECTION_STRING="mongodb://localhost:27022"

docker compose -p runtime-tests -f $(dirname "$0")/docker-compose.yml up -d ferret
