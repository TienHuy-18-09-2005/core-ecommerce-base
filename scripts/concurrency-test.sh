#!/usr/bin/env bash
# Test đồng thời checkout/coupon trên MySQL THẬT nhưng TẠM THỜI:
# container MySQL riêng (dữ liệu trên tmpfs) + mạng Docker riêng, xoá sạch khi kết thúc.
# Không đụng DB dev (container ecom_mysql). Dùng: ./scripts/concurrency-test.sh
# Nếu docker cần sudo: DOCKER="sudo docker" ./scripts/concurrency-test.sh
set -euo pipefail

DOCKER=${DOCKER:-docker}
ROOT=$(cd "$(dirname "$0")/.." && pwd)
NET=ecom_concurrency_net
DB_CT=ecom_mysql_concurrency
DB_NAME=ecom_concurrency_test
DB_PASS=concurrency_only
IMAGE=${BACKEND_IMAGE:-core-ecommerce-base-backend}

cleanup() {
  $DOCKER rm -f "$DB_CT" >/dev/null 2>&1 || true
  $DOCKER network rm "$NET" >/dev/null 2>&1 || true
}
trap cleanup EXIT
cleanup

$DOCKER network create --internal "$NET" >/dev/null
$DOCKER run -d --name "$DB_CT" --network "$NET" --tmpfs /var/lib/mysql \
  -e MYSQL_ROOT_PASSWORD="$DB_PASS" -e MYSQL_DATABASE="$DB_NAME" mysql:8.0 >/dev/null

echo "Đang chờ MySQL tạm khởi động..."
for _ in $(seq 1 60); do
  if $DOCKER exec "$DB_CT" mysql -uroot -p"$DB_PASS" -e "SELECT 1" "$DB_NAME" >/dev/null 2>&1; then
    break
  fi
  sleep 2
done

# Chạy chung network namespace với MySQL tạm (kết nối qua 127.0.0.1) để không phụ thuộc
# luật iptables FORWARD của máy host.
$DOCKER run --rm --network "container:$DB_CT" -v "$ROOT":/var/www -w /var/www/backend \
  -e DB_HOST=127.0.0.1 -e DB_PORT=3306 -e DB_DATABASE="$DB_NAME" \
  -e DB_USERNAME=root -e DB_PASSWORD="$DB_PASS" \
  "$IMAGE" vendor/bin/phpunit -c phpunit.concurrency.xml "$@"
