import boto3
from botocore.exceptions import ClientError
from starlette.concurrency import run_in_threadpool

from app.config import settings

_client = boto3.client(
    "s3",
    endpoint_url=settings.s3_endpoint_url,
    aws_access_key_id=settings.s3_access_key,
    aws_secret_access_key=settings.s3_secret_key,
    region_name=settings.s3_region,
)

# Presigned URLs are handed to browsers, which sit outside the Docker network and
# can't resolve the internal "minio" service hostname — sign against the
# externally-reachable endpoint instead. Signing is a local computation, not a
# network call, so a second client here is cheap.
_public_client = boto3.client(
    "s3",
    endpoint_url=settings.s3_public_endpoint_url,
    aws_access_key_id=settings.s3_access_key,
    aws_secret_access_key=settings.s3_secret_key,
    region_name=settings.s3_region,
)


def _ensure_bucket_sync() -> None:
    try:
        _client.head_bucket(Bucket=settings.s3_bucket_name)
    except ClientError:
        _client.create_bucket(Bucket=settings.s3_bucket_name)


async def ensure_bucket() -> None:
    await run_in_threadpool(_ensure_bucket_sync)


async def put_object(key: str, data: bytes, content_type: str) -> None:
    await run_in_threadpool(
        _client.put_object,
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=data,
        ContentType=content_type,
    )


async def presigned_url(key: str, expires_in: int = 3600) -> str:
    return await run_in_threadpool(
        _public_client.generate_presigned_url,
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )


def thumb_key(key: str) -> str:
    if "." in key:
        base, ext = key.rsplit(".", 1)
        return f"{base}_thumb.{ext}"
    return f"{key}_thumb"
