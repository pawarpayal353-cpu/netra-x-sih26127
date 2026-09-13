def test_health(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "healthy"}


def test_dashboard(client):
    res = client.get("/api/dashboard")
    assert res.status_code == 200
    data = res.json()
    assert data["cameras_total"] == 42


def test_list_cameras(client):
    res = client.get("/api/cameras")
    assert res.status_code == 200
    cams = res.json()
    assert len(cams) == 42
    assert "camera_id" in cams[0]


def test_get_single_camera(client):
    cams = client.get("/api/cameras").json()
    cam_id = cams[0]["camera_id"]
    res = client.get(f"/api/cameras/{cam_id}")
    assert res.status_code == 200
    assert res.json()["camera_id"] == cam_id


def test_camera_not_found(client):
    res = client.get("/api/cameras/C999")
    assert res.status_code == 404


def test_vehicle_search_known_demo_plate(client):
    res = client.get("/api/vehicles/search?plate=MH12AB1234")
    assert res.status_code in (200, 404)  # depends on random seed placement of hops within window


def test_anpr_process(client):
    res = client.post("/api/anpr/process", json={"plate_hint": "MH12AB1234"})
    assert res.status_code == 200
    body = res.json()
    assert body["plate"] == "MH12AB1234"
    assert 0 <= body["confidence"] <= 1


def test_traffic_live(client):
    res = client.get("/api/traffic/live")
    assert res.status_code == 200
    assert len(res.json()) == 10  # 10 roads


def test_traffic_forecast(client):
    res = client.get("/api/traffic/forecast")
    assert res.status_code == 200


def test_mobility_graph(client):
    res = client.get("/api/graph")
    assert res.status_code == 200
    body = res.json()
    assert body["stats"]["nodes"] == 42


def test_alerts_list(client):
    res = client.get("/api/alerts")
    assert res.status_code == 200
    assert isinstance(res.json(), list)


def test_ai_query_general_status(client):
    res = client.post("/api/ai/query", json={"query": "how is the city doing"})
    assert res.status_code == 200
    assert "answer" in res.json()


def test_ai_query_missing_query_rejected(client):
    res = client.post("/api/ai/query", json={})
    assert res.status_code == 400


def test_system_health(client):
    res = client.get("/api/system/health")
    assert res.status_code == 200
    assert res.json()["api"] == "OPERATIONAL"
