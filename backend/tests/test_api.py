from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import create_app


def test_health_endpoint() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/health")

        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_signup_and_reject_unsupported_preview_source() -> None:
    with TestClient(create_app()) as client:
        signup = client.post(
            "/auth/signup",
            json={"email": f"test-{uuid4()}@example.com", "password": "strong-password-123"},
        )
        assert signup.status_code == 201
        token = signup.json()["access_token"]

        response = client.post(
            "/media/preview",
            headers={"Authorization": f"Bearer {token}"},
            json={"url": "https://example.com/video"},
        )

        assert response.status_code == 400
        assert response.json()["title"] == "Unsupported source"
