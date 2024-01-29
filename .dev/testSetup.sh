export CONNECTION_STRING="mongodb://root:example@localhost:27021/?readPreference=primary&appname=transport&ssl=false"

docker compose -p runtime-tests -f $(dirname "$0")/compose.yml up -d mongo
