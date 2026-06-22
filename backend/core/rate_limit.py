from collections import defaultdict, deque
from time import monotonic

from fastapi import HTTPException, Request, status


class InMemoryRateLimiter:
    def __init__(self, max_attempts: int, window_seconds: int) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: dict[str, deque[float]] = defaultdict(deque)

    def assert_allowed(self, key: str) -> None:
        now = monotonic()
        attempts = self._attempts[key]

        while attempts and now - attempts[0] > self.window_seconds:
            attempts.popleft()

        if len(attempts) >= self.max_attempts:
            retry_after = max(1, int(self.window_seconds - (now - attempts[0])))
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Demasiados intentos. Intenta nuevamente mas tarde.",
                headers={"Retry-After": str(retry_after)},
            )

    def record_failure(self, key: str) -> None:
        now = monotonic()
        attempts = self._attempts[key]

        while attempts and now - attempts[0] > self.window_seconds:
            attempts.popleft()

        attempts.append(now)

    def reset(self, key: str) -> None:
        self._attempts.pop(key, None)

    def check(self, key: str) -> None:
        self.assert_allowed(key)
        self.record_failure(key)


auth_limiter = InMemoryRateLimiter(max_attempts=5, window_seconds=15 * 60)


def auth_rate_limit(request: Request) -> None:
    client_host = request.client.host if request.client else "unknown"
    auth_limiter.check(client_host)


def auth_attempt_key(request: Request, email: str) -> str:
    client_host = request.client.host if request.client else "unknown"
    return f"{client_host}:{email.strip().lower()}"
