from app.services.anpr_engine import fuse_ocr_readings, MockANPREngine


def test_fusion_picks_majority_plate():
    readings = [
        {"plate": "MH12AB1234", "confidence": 0.91},
        {"plate": "MH12AB1234", "confidence": 0.95},
        {"plate": "MH12AB1284", "confidence": 0.84},
        {"plate": "MH12AB1234", "confidence": 0.94},
    ]
    result = fuse_ocr_readings(readings)
    assert result["plate"] == "MH12AB1234"
    assert result["confidence"] > 0.9


def test_fusion_empty_input():
    result = fuse_ocr_readings([])
    assert result["plate"] is None
    assert result["confidence"] == 0.0


def test_fusion_single_reading_capped():
    result = fuse_ocr_readings([{"plate": "KA01EF9012", "confidence": 0.99}])
    assert result["plate"] == "KA01EF9012"
    assert result["confidence"] <= 0.995


def test_mock_engine_process_frame_sequence():
    engine = MockANPREngine()
    result = engine.process_frame_sequence("MH12AB1234", n_frames=5)
    assert result["plate"] is not None
    assert 0 <= result["confidence"] <= 1
    assert len(result["frames"]) == 5


def test_mock_engine_single_frame_shape():
    engine = MockANPREngine()
    result = engine.process_frame()
    assert set(["plate", "confidence", "vehicle_type", "quality"]).issubset(result.keys())
