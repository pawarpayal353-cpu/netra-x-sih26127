from app.analytics.engine import congestion_index, road_forecast, detect_route_anomaly


def test_congestion_index_range():
    idx = congestion_index(vehicle_count=3000, capacity=4000, avg_speed=20, baseline_speed=40)
    assert 0 <= idx <= 1


def test_congestion_index_free_flow_is_low():
    idx = congestion_index(vehicle_count=500, capacity=4000, avg_speed=40, baseline_speed=40)
    assert idx < 0.3


def test_road_forecast_shape():
    snapshot = {"road_id": "Central Corridor", "congestion_index": 0.7, "vehicle_count": 3000}
    forecast = road_forecast(snapshot)
    assert forecast["road"] == "Central Corridor"
    assert 0 <= forecast["risk"] <= 1
    assert forecast["prediction_minutes"] > 0


def test_detect_route_anomaly_flags_deviation():
    result = detect_route_anomaly(
        expected_path=["C12", "C17", "C24"],
        observed_path=["C12", "C19", "C27"],
        distance_km_deviation=3.2,
    )
    assert "human review" in result["reason"]
    assert 0 <= result["confidence"] <= 1
    assert result["deviation_km"] == 3.2


def test_detect_route_anomaly_no_deviation_lower_score():
    same_path = detect_route_anomaly(["C12", "C17"], ["C12", "C17"], 0.0)
    diff_path = detect_route_anomaly(["C12", "C17"], ["C12", "C99"], 5.0)
    assert same_path["confidence"] < diff_path["confidence"]
