from datetime import datetime, timezone

from app.services.behavior_analyzer import behavior_analyzer


def test_behavior_analyzer_detects_velocity_anomaly():
    behavior_analyzer.reset()

    did = "did:example:velocity-test"

    timestamp = datetime(
        2026,
        9,
        11,
        10,
        0,
        tzinfo=timezone.utc,
    )

    result = None

    for _ in range(5):
        result = behavior_analyzer.observe(
            did=did,
            action="READ",
            resource_id="employee-records",
            timestamp=timestamp,
        )

    assert result is not None
    assert result["checkpoint"] == "BEHAVIOR_PATTERN"
    assert result["detected"] is True
    assert result["score"] >= 40

    velocity = next(
        finding
        for finding in result["findings"]
        if finding["checkpoint"] == "BEHAVIOR_VELOCITY"
    )

    assert velocity["detected"] is True
    assert velocity["evidence"]["action_count"] == 5


def test_behavior_analyzer_detects_time_of_day_anomaly():
    behavior_analyzer.reset()

    result = behavior_analyzer.observe(
        did="did:example:time-test",
        action="READ",
        resource_id="employee-records",
        timestamp=datetime(
            2026,
            9,
            11,
            2,
            0,
            tzinfo=timezone.utc,
        ),
    )

    assert result["detected"] is True

    time_finding = next(
        finding
        for finding in result["findings"]
        if finding["checkpoint"] == "BEHAVIOR_TIME_OF_DAY"
    )

    assert time_finding["detected"] is True
    assert time_finding["score"] == 25


def test_behavior_analyzer_detects_sequence_anomaly():
    behavior_analyzer.reset()

    did = "did:example:sequence-test"

    timestamp = datetime(
        2026,
        9,
        11,
        10,
        0,
        tzinfo=timezone.utc,
    )

    behavior_analyzer.observe(
        did=did,
        action="READ",
        resource_id="employee-records",
        timestamp=timestamp,
    )

    result = behavior_analyzer.observe(
        did=did,
        action="PRIVILEGE_ESCALATION",
        resource_id="acme-admin-console",
        timestamp=timestamp,
    )

    assert result["detected"] is True

    sequence = next(
        finding
        for finding in result["findings"]
        if finding["checkpoint"] == "BEHAVIOR_SEQUENCE"
    )

    assert sequence["detected"] is True
    assert sequence["score"] == 35


def test_behavior_analyzer_normal_activity():
    behavior_analyzer.reset()

    result = behavior_analyzer.observe(
        did="did:example:normal-test",
        action="READ",
        resource_id="employee-records",
        timestamp=datetime(
            2026,
            9,
            11,
            10,
            0,
            tzinfo=timezone.utc,
        ),
    )

    assert result["checkpoint"] == "BEHAVIOR_PATTERN"
    assert result["detected"] is False
    assert result["score"] == 0