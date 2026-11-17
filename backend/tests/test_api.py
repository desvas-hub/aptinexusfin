from fastapi.testclient import TestClient

from app.main import app


def register(client: TestClient, email: str):
    return client.post("/api/v1/auth/register", json={
        "name": "CI User",
        "email": email,
        "password": "A-Long-Test-Password-123!",
    })


def test_health():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        assert response.json()["status"] == "ok"


def test_auth_and_protected_catalogs():
    with TestClient(app) as client:
        response = register(client, "ci-user@example.test")
        assert response.status_code == 201
        headers = {"Authorization": f"Bearer {response.json()['token']}"}

        assert client.get("/api/v1/careers").status_code == 401
        assert client.get("/api/v1/skills", headers=headers).status_code == 200
        assert client.get("/api/v1/resources", headers=headers).status_code == 200
        assert register(client, "ci-user@example.test").status_code == 409


def test_dashboard_and_skillgraph_only_use_saved_skills_and_evidence():
    with TestClient(app) as client:
        response = register(client, "skill-source-ci@example.test")
        headers = {"Authorization": f"Bearer {response.json()['token']}"}
        saved = client.put("/api/v1/profiles/me", headers=headers, json={
            "personal": {},
            "sections": {
                "technical": ["Python"],
                "subjects": ["CAD Design"],
                "projects": ["ROS"],
                "certifications": ["Embedded C"],
                "experience": ["Computer Vision"],
            },
        })
        assert saved.status_code == 200

        dashboard = client.get("/api/v1/analytics/dashboard", headers=headers).json()
        assert [skill["name"] for skill in dashboard["skills"]] == ["Python"]
        assert "level" not in dashboard["skills"][0]
        robotics = next(item for item in dashboard["careers"] if item["id"] == "robotics")
        assert robotics["matched"] == ["Python"]
        assert "CAD Design" in robotics["missing"]
        assert "ROS" in robotics["missing"]

        graph = client.get("/api/v1/skillgraph", headers=headers).json()
        assert [node["label"] for node in graph["nodes"] if node["cat"] == "skill"] == ["Python"]


def test_assessment_answers_are_not_exposed_and_are_scored_server_side():
    with TestClient(app) as client:
        response = register(client, "assessment-ci@example.test")
        headers = {"Authorization": f"Bearer {response.json()['token']}"}
        quizzes = client.get("/api/v1/assessments", headers=headers)
        assert quizzes.status_code == 200
        quiz = quizzes.json()[0]
        assert "answer" not in quiz["questions"][0]

        submitted = client.post(
            f"/api/v1/assessments/{quiz['id']}/submit",
            headers=headers,
            json={"answers": [1, 1, 0, 1]},
        )
        assert submitted.status_code == 200
        assert submitted.json()["total"] == 4
        assert len(submitted.json()["correctAnswers"]) == 4


def test_resume_upload_rejects_unsupported_file():
    with TestClient(app) as client:
        response = register(client, "resume-ci@example.test")
        headers = {"Authorization": f"Bearer {response.json()['token']}"}
        result = client.post(
            "/api/v1/resume/analyze",
            headers=headers,
            files={"file": ("resume.txt", b"not a resume format", "text/plain")},
        )
        assert result.status_code == 415

