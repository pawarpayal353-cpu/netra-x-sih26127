from datetime import datetime, timedelta, timezone
from app.trajectory.matcher import (
    score_transition, plate_similarity, haversine_km, get_camera_graph, infer_missing_camera,
)


def test_plate_similarity_identical():
    assert plate_similarity("MH12AB1234", "MH12AB1234") == 1.0


def test_plate_similarity_one_char_off():
    sim = plate_similarity("MH12AB1234", "MH12AB1284")
    assert 0 < sim < 1.0


def test_haversine_zero_distance():
    assert haversine_km(21.0, 79.0, 21.0, 79.0) == 0


def test_haversine_positive_distance():
    d = haversine_km(21.0, 79.0, 21.01, 79.01)
    assert d > 0


def test_camera_graph_has_42_cameras():
    cameras, edges, adjacency = get_camera_graph()
    assert len(cameras) == 42
    assert len(edges) > 0


def test_score_transition_same_camera_scores_high_ocr():
    cameras, _, _ = get_camera_graph()
    cam_id = cameras[0]["camera_id"]
    t0 = datetime.now(timezone.utc)
    obs_a = {"camera_id": cam_id, "timestamp": t0, "plate_text": "MH12AB1234", "ocr_confidence": 0.95}
    obs_b = {"camera_id": cam_id, "timestamp": t0 + timedelta(minutes=1), "plate_text": "MH12AB1234", "ocr_confidence": 0.95}
    result = score_transition(obs_a, obs_b, "car", "car")
    assert result["ocr_similarity"] == 1.0
    assert result["score"] > 0


def test_infer_missing_camera_returns_candidates():
    cameras, edges, adjacency = get_camera_graph()
    cam_from = cameras[0]["camera_id"]
    cam_to = cameras[2]["camera_id"]
    candidates = infer_missing_camera(cam_from, cam_to)
    assert isinstance(candidates, list)
    assert all(c.get("inferred") for c in candidates)
