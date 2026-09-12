from __future__ import annotations

from collections import defaultdict, deque
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import RLock
from typing import Deque


@dataclass(frozen=True)
class BehaviorObservation:
    did: str
    action: str
    resource_id: str
    timestamp: datetime
    synthetic: bool = False


@dataclass(frozen=True)
class BehaviorFinding:
    checkpoint: str
    detected: bool
    score: int
    reason: str
    evidence: dict


@dataclass
class IdentityBehaviorState:
    observations: Deque[BehaviorObservation]
    last_action: str | None = None
    last_resource: str | None = None


class BehaviorAnalyzer:
    """
    Detects behavioral anomalies for an identity.

    Signals:
    - velocity: unusually frequent actions
    - time_of_day: activity outside the identity's normal window
    - sequence: suspicious action progression
    """

    CHECKPOINT = "BEHAVIOR_PATTERN"

    WINDOW_SECONDS = 60
    VELOCITY_THRESHOLD = 5

    DEFAULT_ACTIVE_START_HOUR = 8
    DEFAULT_ACTIVE_END_HOUR = 20

    SUSPICIOUS_SEQUENCES = {
        (
            "READ",
            "PRIVILEGE_ESCALATION",
        ),
        (
            "PRIVILEGE_ESCALATION",
            "DELETE",
        ),
        (
            "READ",
            "TRANSFER",
        ),
        (
            "UPDATE",
            "TRANSFER",
        ),
        (
            "TRANSFER",
            "DELETE",
        ),
    }

    def __init__(self) -> None:
        self._states: dict[str, IdentityBehaviorState] = defaultdict(
            lambda: IdentityBehaviorState(observations=deque())
        )
        self._lock = RLock()

    def reset(self) -> None:
        with self._lock:
            self._states.clear()

    def observe(
        self,
        *,
        did: str,
        action: str,
        resource_id: str,
        timestamp: datetime | None = None,
        synthetic: bool = False,
    ) -> dict:
        now = timestamp or datetime.now(timezone.utc)

        if now.tzinfo is None:
            now = now.replace(tzinfo=timezone.utc)

        observation = BehaviorObservation(
            did=did,
            action=action,
            resource_id=resource_id,
            timestamp=now,
            synthetic=synthetic,
        )

        with self._lock:
            state = self._states[did]

            state.observations.append(observation)

            cutoff = now - timedelta(seconds=self.WINDOW_SECONDS)

            while (
                state.observations
                and state.observations[0].timestamp < cutoff
            ):
                state.observations.popleft()

            findings = [
                self._velocity_finding(state),
                self._time_of_day_finding(observation),
                self._sequence_finding(state, observation),
            ]

            detected_findings = [
                finding
                for finding in findings
                if finding.detected
            ]

            score = min(
                100,
                sum(finding.score for finding in detected_findings),
            )

            state.last_action = action
            state.last_resource = resource_id

            return {
                "checkpoint": self.CHECKPOINT,
                "detected": bool(detected_findings),
                "score": score,
                "findings": [
                    {
                        "checkpoint": finding.checkpoint,
                        "detected": finding.detected,
                        "score": finding.score,
                        "reason": finding.reason,
                        "evidence": finding.evidence,
                    }
                    for finding in findings
                ],
            }

    def _velocity_finding(
        self,
        state: IdentityBehaviorState,
    ) -> BehaviorFinding:
        count = len(state.observations)

        detected = count >= self.VELOCITY_THRESHOLD

        return BehaviorFinding(
            checkpoint="BEHAVIOR_VELOCITY",
            detected=detected,
            score=40 if detected else 0,
            reason=(
                f"{count} actions observed within "
                f"{self.WINDOW_SECONDS} seconds."
                if detected
                else "Action velocity is within the normal threshold."
            ),
            evidence={
                "window_seconds": self.WINDOW_SECONDS,
                "action_count": count,
                "threshold": self.VELOCITY_THRESHOLD,
            },
        )

    def _time_of_day_finding(
        self,
        observation: BehaviorObservation,
    ) -> BehaviorFinding:
        hour = observation.timestamp.hour

        detected = not (
            self.DEFAULT_ACTIVE_START_HOUR
            <= hour
            < self.DEFAULT_ACTIVE_END_HOUR
        )

        return BehaviorFinding(
            checkpoint="BEHAVIOR_TIME_OF_DAY",
            detected=detected,
            score=25 if detected else 0,
            reason=(
                f"Activity occurred outside the expected "
                f"{self.DEFAULT_ACTIVE_START_HOUR:02d}:00-"
                f"{self.DEFAULT_ACTIVE_END_HOUR:02d}:00 window."
                if detected
                else "Activity occurred within the expected time window."
            ),
            evidence={
                "hour_utc": hour,
                "expected_start_hour": self.DEFAULT_ACTIVE_START_HOUR,
                "expected_end_hour": self.DEFAULT_ACTIVE_END_HOUR,
            },
        )

    def _sequence_finding(
        self,
        state: IdentityBehaviorState,
        observation: BehaviorObservation,
    ) -> BehaviorFinding:
        previous_action = state.last_action

        sequence = (
            previous_action,
            observation.action,
        )

        detected = (
            previous_action is not None
            and sequence in self.SUSPICIOUS_SEQUENCES
        )

        return BehaviorFinding(
            checkpoint="BEHAVIOR_SEQUENCE",
            detected=detected,
            score=35 if detected else 0,
            reason=(
                f"Suspicious action sequence detected: "
                f"{previous_action} → {observation.action}."
                if detected
                else "Action sequence is within the configured baseline."
            ),
            evidence={
                "previous_action": previous_action,
                "current_action": observation.action,
                "resource_id": observation.resource_id,
            },
        )

    def get_state(self, did: str) -> dict:
        with self._lock:
            state = self._states.get(did)

            if state is None:
                return {
                    "did": did,
                    "observations": 0,
                    "last_action": None,
                    "last_resource": None,
                }

            return {
                "did": did,
                "observations": len(state.observations),
                "last_action": state.last_action,
                "last_resource": state.last_resource,
            }


behavior_analyzer = BehaviorAnalyzer()