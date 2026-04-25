import os

os.environ.setdefault("OWNER_EMAIL", "owner@example.com")
os.environ.setdefault("OWNER_PASSWORD", "owner-strong-password-123")

from fastapi.testclient import TestClient  # noqa: E402

from app.main import create_app  # noqa: E402


def test_health_endpoint() -> None:
    with TestClient(create_app()) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_owner_login_rejects_unsupported_preview_source() -> None:
    with TestClient(create_app()) as client:
        login = client.post(
            "/auth/login",
            json={
                "email": os.environ["OWNER_EMAIL"],
                "password": os.environ["OWNER_PASSWORD"],
            },
        )
        assert login.status_code == 200, login.text
        token = login.json()["access_token"]

        response = client.post(
            "/media/preview",
            headers={"Authorization": f"Bearer {token}"},
            json={"url": "https://example.com/video"},
        )
        assert response.status_code == 400
        assert response.json()["title"] == "Unsupported source"


def test_signup_route_is_disabled() -> None:
    with TestClient(create_app()) as client:
        response = client.post(
            "/auth/signup",
            json={"email": "anon@example.com", "password": "strong-password-123"},
        )
        assert response.status_code in {404, 405}


def test_invite_flow_creates_guest_session() -> None:
    with TestClient(create_app()) as client:
        login = client.post(
            "/auth/login",
            json={
                "email": os.environ["OWNER_EMAIL"],
                "password": os.environ["OWNER_PASSWORD"],
            },
        )
        assert login.status_code == 200
        token = login.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        create = client.post(
            "/invites",
            headers=headers,
            json={"label": "Papa", "expires_in_hours": 1, "max_uses": 1},
        )
        assert create.status_code == 201, create.text
        invite_url = create.json()["url"]
        assert invite_url and "/invite/" in invite_url
        invite_token = invite_url.rsplit("/", 1)[-1]

        redeem = client.post(f"/invites/{invite_token}/redeem")
        assert redeem.status_code == 200, redeem.text
        guest_session = redeem.json()
        assert guest_session["user"]["role"] == "guest"

        guest_headers = {"Authorization": f"Bearer {guest_session['access_token']}"}

        denied = client.get("/invites", headers=guest_headers)
        assert denied.status_code == 403

        second = client.post(f"/invites/{invite_token}/redeem")
        assert second.status_code == 404
