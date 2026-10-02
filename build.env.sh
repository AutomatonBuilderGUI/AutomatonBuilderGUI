touch .env
(echo "TIME=$(date)" && echo "GIT_HASH=$(git rev-parse --short HEAD)") > .env
